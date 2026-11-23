"""Validate release isolation using example settings; never read or print secrets."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
command = ["docker", "compose", "--env-file", "deploy/.env.example", "--profile", "tools", "-f", "deploy/compose.yml",
           "-f", "deploy/compose.recovery.yml", "config", "--no-env-resolution", "--format", "json"]
config = json.loads(subprocess.check_output(command, cwd=ROOT))
services = config["services"]
assert config["networks"]["database_private"]["internal"], "Database network is public"
for name in ("postgres", "migrate", "backup", "recovery"):
    assert not services[name].get("ports"), f"{name} publishes ports"
    assert set(services[name]["networks"]) == {"database_private"}, f"{name} has an egress network"
for name in ("api", "frontend"):
    service = services[name]
    assert service["read_only"], f"{name} has a writable root filesystem"
    assert "ALL" in service["cap_drop"], f"{name} retains capabilities"
    assert "no-new-privileges:true" in service["security_opt"], f"{name} can gain privileges"
    assert not service.get("ports"), f"{name} bypasses HTTPS edge"
    assert not any(v["target"] == "/var/run/docker.sock" for v in service.get("volumes", [])), "Default stack exposes Docker"
assert services["api"]["environment"]["APP_ENV"] == "production"
assert services["api"]["environment"]["ALLOW_PRIVATE_DATABASE"] == "true"
print("PASS: deployment network, port, filesystem, capability and default runner isolation checks")
