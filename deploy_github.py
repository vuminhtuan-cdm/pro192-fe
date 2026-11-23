import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# 1. Get Token
p = subprocess.run(
    ['git', 'credential', 'fill'],
    input='protocol=https\nhost=github.com\n\n',
    text=True,
    capture_output=True
)
lines = p.stdout.splitlines()
creds = dict(line.split('=', 1) for line in lines if '=' in line)
token = creds.get('password')
user = creds.get('username', 'vuminhtuan-cdm')

if not token:
    print("ERROR: No token found!")
    sys.exit(1)

print(f"Logged in as {user}")

repo_name = "pro192-fe"
headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Antigravity-Agent"
}

# 2. Check if repo exists
check_url = f"https://api.github.com/repos/{user}/{repo_name}"
req = urllib.request.Request(check_url, headers=headers)
repo_exists = False
try:
    with urllib.request.urlopen(req) as resp:
        if resp.status == 200:
            print(f"Repository {user}/{repo_name} already exists.")
            repo_exists = True
except urllib.error.HTTPError as e:
    if e.code == 404:
        print(f"Repository {user}/{repo_name} does not exist yet. Will create.")
    else:
        print(f"Check error: {e}")

# 3. Create repo if not exists
if not repo_exists:
    create_url = "https://api.github.com/user/repos"
    payload = {
        "name": repo_name,
        "description": "PRO192 - Hệ Thống Ôn Thi & Thi Thử OOP Java (Object-Oriented Programming FE - FPT University)",
        "private": False,
        "auto_init": False
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(create_url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Created repository {repo_name} successfully: status {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"Failed to create repo: {e.code} {e.read().decode('utf-8')}")
        sys.exit(1)

# 4. Initialize Git and Push
target_dir = r"C:\Users\Admin\.gemini\antigravity\scratch\pro192"
os.chdir(target_dir)

remote_url = f"https://{token}@github.com/{user}/{repo_name}.git"

def run_git(cmd_list):
    res = subprocess.run(cmd_list, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Git command failed: {' '.join(cmd_list)}")
        print("STDERR:", res.stderr)
        print("STDOUT:", res.stdout)
    return res

if not os.path.exists(os.path.join(target_dir, ".git")):
    run_git(["git", "init"])

run_git(["git", "config", "user.name", "vuminhtuan-cdm"])
run_git(["git", "config", "user.email", "vuminhtuan.cdm@gmail.com"])

# Reset remotes
run_git(["git", "remote", "remove", "origin"])
run_git(["git", "remote", "add", "origin", remote_url])

run_git(["git", "add", "-A"])
status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
if status.stdout.strip():
    run_git(["git", "commit", "-m", "feat: deploy PRO192 study & exam web app with initial official exams"])
    print("Committed files.")
else:
    print("No changes to commit.")

run_git(["git", "branch", "-M", "main"])
push_res = run_git(["git", "push", "-u", "origin", "main", "--force"])
if push_res.returncode == 0:
    print(f"Pushed to {user}/{repo_name} successfully!")
else:
    print("Push error:", push_res.stderr)
    sys.exit(1)

# 5. Enable GitHub Pages
pages_url = f"https://api.github.com/repos/{user}/{repo_name}/pages"
pages_payload = {
    "source": {
        "branch": "main",
        "path": "/"
    }
}
req = urllib.request.Request(
    pages_url,
    data=json.dumps(pages_payload).encode('utf-8'),
    headers=headers,
    method="POST"
)
try:
    with urllib.request.urlopen(req) as resp:
        print("GitHub Pages enabled successfully!")
except urllib.error.HTTPError as e:
    if e.code == 409:
        print("GitHub Pages is already active.")
    else:
        print(f"Pages status/info: {e.code} {e.read().decode('utf-8')}")

print("\nDeploy completed!")
print(f"Production URL: https://{user}.github.io/{repo_name}/")
