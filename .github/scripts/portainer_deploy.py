"""
Deploy do Forecast no Portainer via Docker container API.
Estratégia: pull nova imagem (tag única por build) → stop + rm + create + start.
Isso evita completamente o problema de cache do 'latest' no host Docker.
"""
import os, json, sys, urllib.request, urllib.error, ssl

BASE      = "https://191.233.21.33:9000"
EP        = 3
BUILD_TAG = os.environ.get("BUILD_TAG", "latest")
REPO      = "vdmprod.azurecr.io/samples/vendemmia-forecast"
IMAGE     = f"{REPO}:{BUILD_TAG}"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode    = ssl.CERT_NONE


class Portainer:
    token = ""

    def call(self, method, path, data=None, xh=None):
        hdrs = {"Content-Type": "application/json"}
        if self.token:
            hdrs["Authorization"] = f"Bearer {self.token}"
        if xh:
            hdrs.update(xh)
        body = json.dumps(data).encode() if data is not None else None
        rq = urllib.request.Request(f"{BASE}{path}", data=body, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(rq, context=ctx) as r:
                raw = r.read()
                return r.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as e:
            raw = e.read()
            return e.code, (json.loads(raw) if raw else {"message": str(e)})


p = Portainer()

# ── Auth ──────────────────────────────────────────────────────────────────────
print(f"=== Auth no Portainer ({BASE}) ===")
_, auth = p.call("POST", "/api/auth", {
    "Username": os.environ["PORTAINER_USER"],
    "Password": os.environ["PORTAINER_PASS"],
})
p.token = auth.get("jwt", "")
if not p.token:
    print("❌ Auth falhou:", auth)
    sys.exit(1)
print("✅ Autenticado")

# ── Pull da imagem com tag única ───────────────────────────────────────────────
print(f"\n=== Pull {IMAGE} ===")
acr_auth = os.environ.get("ACR_AUTH_B64", "")
st, _ = p.call(
    "POST",
    f"/api/endpoints/{EP}/docker/v1.41/images/create"
    f"?fromImage={REPO}&tag={BUILD_TAG}",
    xh={"X-Registry-Auth": acr_auth},
)
print(f"HTTP {st}")
if st not in (200, 201, 204):
    print(f"❌ Pull da imagem {IMAGE} falhou — abortando deploy")
    sys.exit(1)
print("✅ Imagem baixada com sucesso")

# ── Listar containers ─────────────────────────────────────────────────────────
print("\n=== Containers ===")
_, cs = p.call("GET", f"/api/endpoints/{EP}/docker/v1.41/containers/json?all=true")
for c in cs:
    ports = [f"{px.get('PublicPort','')}:{px.get('PrivatePort','')}"
             for px in c.get("Ports", []) if px.get("PublicPort")]
    print(f"  {c.get('Names')}  img={c.get('Image','')[:55]}  ports={ports}  status={c.get('Status','')}")

# Busca container por nome
cid = None
for name in ["vendemmia-forecast", "forecast-app", "forecast"]:
    for c in cs:
        if any(name in n for n in c.get("Names", [])):
            cid   = c["Id"]
            cname = c["Names"][0].lstrip("/")
            print(f"\n✅ Alvo: '{cname}' ({cid[:12]})  imagem atual: {c.get('Image','')}")
            break
    if cid:
        break

# Fallback: busca por porta 3000
if not cid:
    for c in cs:
        for px in c.get("Ports", []):
            if px.get("PublicPort") == 3000 or px.get("PrivatePort") == 3000:
                cid   = c["Id"]
                cname = c["Names"][0].lstrip("/")
                print(f"✅ Alvo (porta 3000): '{cname}' ({cid[:12]})")
                break
        if cid:
            break

if not cid:
    print("❌ Container não encontrado — verifique os nomes acima e ajuste o script")
    sys.exit(1)

# ── Inspecionar para preservar config ────────────────────────────────────────
_, ins = p.call("GET", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}/json")

# ── Stop ─────────────────────────────────────────────────────────────────────
print("\n=== Stop ===")
st, _ = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}/stop")
print(f"HTTP {st}  (204=ok, 304=já parado)")

# ── Remove (força mesmo se running) ──────────────────────────────────────────
print("\n=== Remove ===")
st, rm_resp = p.call("DELETE", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}?force=true&v=false")
print(f"HTTP {st}")
if st not in (204, 404):
    print(f"❌ Remove falhou: {rm_resp}")
    sys.exit(1)

# ── Create com nova imagem ────────────────────────────────────────────────────
skip = {"Hostname", "Domainname", "AttachStdin", "AttachStdout", "AttachStderr", "Tty", "OpenStdin", "StdinOnce"}
cfg  = {k: v for k, v in ins["Config"].items() if k not in skip}
cfg["Image"]            = IMAGE
cfg["HostConfig"]       = ins["HostConfig"]
cfg["NetworkingConfig"] = {"EndpointsConfig": ins.get("NetworkSettings", {}).get("Networks", {})}

print(f"\n=== Create '{cname}' com {IMAGE} ===")
st, new = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/create?name={cname}", cfg)
print(f"HTTP {st}")
if st not in (200, 201) or "Id" not in new:
    print(f"❌ Create falhou: {json.dumps(new, indent=2)}")
    sys.exit(1)

# ── Start ─────────────────────────────────────────────────────────────────────
print("\n=== Start ===")
st, _ = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/{new['Id']}/start")
print(f"HTTP {st}")
if st in (204, 304):
    print(f"\n✅ Deploy concluído — '{cname}' rodando com {IMAGE}")
else:
    print(f"❌ Start retornou {st}")
    sys.exit(1)
