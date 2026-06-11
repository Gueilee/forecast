"""
Deploy do Forecast no Portainer via Stack API (pull + redeploy).
Env vars: PORTAINER_USER, PORTAINER_PASS, ACR_AUTH_B64
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

# ── Auth ──────────────────────────────────────────────────────────────────────
_, auth = p.call("POST", "/api/auth", {
    "Username": os.environ["PORTAINER_USER"],
    "Password": os.environ["PORTAINER_PASS"],
})
p.token = auth.get("jwt", "")
if not p.token:
    print("❌ Auth falhou:", auth)
    sys.exit(1)
print("✅ Autenticado no Portainer")

# ── Pull da nova imagem via Docker proxy ─────────────────────────────────────
print("\n=== Pull nova imagem ===")
st, pull_resp = p.call(
    "POST",
    f"/api/endpoints/{EP}/docker/v1.41/images/create"
    f"?fromImage=vdmprod.azurecr.io/samples/vendemmia-forecast&tag=latest",
    xh={"X-Registry-Auth": os.environ.get("ACR_AUTH_B64", "")},
)
print(f"HTTP {st}")
if st not in (200, 201, 204):
    print(f"⚠️  Pull retornou {st}: {pull_resp} — continuando mesmo assim")
else:
    print("✅ Pull concluído")

# ── Listar Stacks ─────────────────────────────────────────────────────────────
print("\n=== Stacks no Portainer ===")
_, stacks = p.call("GET", "/api/stacks")
for s in stacks:
    print(f"  ID={s['Id']}  Nome={s['Name']}  Status={s.get('Status','?')}  EP={s.get('EndpointId','?')}")

# ── Tentar atualizar via Stack API ────────────────────────────────────────────
with open("docker-compose.yml") as f:
    compose_content = f.read()

stack = None
for name in ["forecast", "vendemmia", "app"]:
    for s in stacks:
        if name in s["Name"].lower():
            stack = s
            print(f"\n✅ Stack encontrada: '{s['Name']}' (ID {s['Id']})")
            break
    if stack:
        break

if stack:
    stack_id = stack["Id"]
    # Preserva variáveis de ambiente já configuradas na stack
    env = stack.get("Env", [])

    print(f"   Atualizando stack com novo compose (pullImage=true)...")
    st, resp = p.call(
        "PUT",
        f"/api/stacks/{stack_id}?endpointId={EP}",
        {
            "stackFileContent": compose_content,
            "env": env,
            "prune": True,
            "pullImage": True,
        },
    )
    print(f"Stack update: HTTP {st}")
    if st in (200, 201):
        print("✅ Stack atualizada! O Portainer vai recriar o container com a nova imagem.")
        sys.exit(0)
    else:
        print(f"⚠️  Stack update retornou {st}: {resp.get('message', resp)}")
        print("   Tentando via manipulação direta de container...")

# ── Fallback: manipulação direta de container ─────────────────────────────────
print("\n=== Containers no servidor ===")
_, cs = p.call("GET", f"/api/endpoints/{EP}/docker/v1.41/containers/json?all=true")
for c in cs:
    ports = [f"{px.get('PublicPort','')}:{px.get('PrivatePort','')}"
             for px in c.get("Ports", []) if px.get("PublicPort")]
    print(f"  NOME={c.get('Names')}  IMAGEM={c.get('Image','')[:60]}  PORTAS={ports or 'n/a'}  STATUS={c.get('Status','')}")

# Busca por nome
cid = None
for name in ["vendemmia-forecast", "forecast-app", "forecast"]:
    for c in cs:
        if any(name in n for n in c.get("Names", [])):
            cid = c["Id"]
            print(f"\n✅ Container encontrado por nome '{name}': {c['Names']} ({cid[:12]})")
            break
    if cid:
        break

# Busca por porta 3000
if not cid:
    print("⚠️  Não encontrado por nome — buscando por porta 3000...")
    for c in cs:
        if any(px.get("PublicPort") == 3000 or px.get("PrivatePort") == 3000
               for px in c.get("Ports", [])):
            cid = c["Id"]
            print(f"✅ Container encontrado por porta 3000: {c['Names']} ({cid[:12]})")
            break

if not cid:
    print("❌ Container não encontrado. Veja a lista acima.")
    sys.exit(1)

_, ins = p.call("GET", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}/json")
cname = ins["Name"].lstrip("/")
print(f"\nAlvo: {cname} | Imagem atual: {ins['Config']['Image']}")

# Stop
print("\n=== Stop ===")
st, _ = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}/stop")
print(f"HTTP {st}")

# Remove
print("\n=== Remove ===")
st, _ = p.call("DELETE", f"/api/endpoints/{EP}/docker/v1.41/containers/{cid}?force=true")
print(f"HTTP {st}")

# Create
skip = {"Hostname", "Domainname", "AttachStdin", "AttachStdout", "AttachStderr", "Tty", "OpenStdin", "StdinOnce"}
cfg = {k: v for k, v in ins["Config"].items() if k not in skip}
cfg["Image"]            = IMAGE
cfg["HostConfig"]       = ins["HostConfig"]
cfg["NetworkingConfig"] = {"EndpointsConfig": ins.get("NetworkSettings", {}).get("Networks", {})}

print("\n=== Create ===")
st, new = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/create?name={cname}", cfg)
print(f"HTTP {st}")
if st not in (200, 201) or "Id" not in new:
    print("❌ Create falhou:", json.dumps(new, indent=2))
    sys.exit(1)

# Start
print("\n=== Start ===")
st, _ = p.call("POST", f"/api/endpoints/{EP}/docker/v1.41/containers/{new['Id']}/start")
print(f"HTTP {st}")
if st in (204, 304):
    print(f"\n✅ '{cname}' recriado com nova imagem: {IMAGE}")
else:
    print(f"⚠️ Start retornou {st}")
    sys.exit(1)
