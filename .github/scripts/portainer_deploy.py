"""
Recria o container do Forecast no Portainer com a nova imagem do Azure ACR.
Env vars necessárias: PORTAINER_USER, PORTAINER_PASS, ACR_AUTH_B64
"""
import os, json, sys, urllib.request, urllib.error, ssl

BASE  = "https://191.233.21.33:9000"
EP    = 3
IMAGE = "vdmprod.azurecr.io/samples/vendemmia-forecast:latest"

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

# --- Auth ---
_, auth = p.call("POST", "/api/auth", {
    "Username": os.environ["PORTAINER_USER"],
    "Password": os.environ["PORTAINER_PASS"],
})
p.token = auth.get("jwt", "")
if not p.token:
    print("❌ Auth falhou:", auth)
    sys.exit(1)
print("✅ Autenticado no Portainer")

# --- Listar TODOS os containers com detalhes ---
_, cs = p.call("GET", f"/api/endpoints/{EP}/docker/v1.41/containers/json?all=true")
print(f"\n{'='*60}")
print(f"CONTAINERS NO SERVIDOR ({len(cs)} encontrados):")
print(f"{'='*60}")
for c in cs:
    ports = [
        f"{px.get('PublicPort','')}:{px.get('PrivatePort','')}"
        for px in c.get("Ports", []) if px.get("PublicPort")
    ]
    print(f"  NOME:   {c.get('Names')}")
    print(f"  IMAGEM: {c.get('Image','')}")
    print(f"  STATUS: {c.get('Status','')}")
    print(f"  PORTAS: {ports or 'nenhuma'}")
    print(f"  ID:     {c.get('Id','')[:12]}")
    print()
print(f"{'='*60}")

# --- Localizar container: por nome, depois por porta 3000 ---
cid = None

for name in ["vendemmia-forecast", "forecast-app", "forecast"]:
    for c in cs:
        if any(name in n for n in c.get("Names", [])):
            cid = c["Id"]
            print(f"✅ Encontrado por nome '{name}': {c['Names']} ({cid[:12]})")
            break
    if cid:
        break

if not cid:
    print("⚠️  Não encontrado por nome — buscando por porta 3000...")
    for c in cs:
        if any(px.get("PublicPort") == 3000 or px.get("PrivatePort") == 3000
               for px in c.get("Ports", [])):
            cid = c["Id"]
            print(f"✅ Encontrado por porta 3000: {c['Names']} ({cid[:12]})")
            break

if not cid:
    print("❌ Container não encontrado. Veja a lista acima para diagnóstico.")
    sys.exit(1)

# --- Inspecionar config completa ---
_, ins = p.call("GET", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}/json")
cname = ins["Name"].lstrip("/")
print(f"\nContainer alvo:  {cname}")
print(f"Imagem atual:    {ins['Config']['Image']}")
print(f"Restart policy:  {ins['HostConfig'].get('RestartPolicy', {})}")
print(f"Port bindings:   {ins['HostConfig'].get('PortBindings', {})}")

# --- Pull nova imagem ---
print("\n=== Pull nova imagem ===")
st, _ = p.call(
    "POST",
    f"/api/endpoints/{EP}/docker/v1.41/images/create"
    f"?fromImage=vdmprod.azurecr.io/samples/vendemmia-forecast&tag=latest",
    xh={"X-Registry-Auth": os.environ.get("ACR_AUTH_B64", "")},
)
print(f"HTTP {st}")

# --- Stop ---
print("\n=== Stop ===")
st, _ = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}/stop")
print(f"HTTP {st}")

# --- Remove ---
print("\n=== Remove ===")
st, resp = p.call("DELETE", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}?force=true")
print(f"HTTP {st}", resp.get("message", "") if st not in (200, 204) else "ok")

# --- Montar body de criação ---
skip = {"Hostname", "Domainname", "AttachStdin", "AttachStdout",
        "AttachStderr", "Tty", "OpenStdin", "StdinOnce"}
cfg = {k: v for k, v in ins["Config"].items() if k not in skip}
cfg["Image"]            = IMAGE
cfg["HostConfig"]       = ins["HostConfig"]
cfg["NetworkingConfig"] = {
    "EndpointsConfig": ins.get("NetworkSettings", {}).get("Networks", {})
}

# --- Create ---
print("\n=== Create ===")
st, new = p.call(
    "POST",
    f"/api/endpoints/{EP}/docker/v1.41/containers/create?name={cname}",
    cfg,
)
print(f"HTTP {st}")
if st not in (200, 201) or "Id" not in new:
    print("❌ Create falhou:", json.dumps(new, indent=2))
    sys.exit(1)

new_id = new["Id"]
print(f"Novo ID: {new_id[:12]}")

# --- Start ---
print("\n=== Start ===")
st, _ = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/{new_id}/start")
print(f"HTTP {st}")
if st in (204, 304):
    print(f"\n✅ '{cname}' recriado com nova imagem: {IMAGE}")
else:
    print(f"⚠️ Start retornou {st}")
    sys.exit(1)
