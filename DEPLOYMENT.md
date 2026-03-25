# Deployment Guide (Production)

This project has two practical production paths:

1. **Best for your current architecture (persistent SQLite + Chroma files):** Oracle Cloud Always Free VM
2. **Managed free deployment:** Render blueprint (`render.yaml`) in this repo

---

## 1) Oracle Cloud VM (recommended)

### Why
- Keeps local file-based storage (`db.sqlite3`, `media/`, `chromadb_data/`) persistent.
- Requires minimal architectural changes.

### Steps

```zsh
sudo apt update
sudo apt install -y python3-venv python3-pip nginx git
```

```zsh
git clone https://github.com/Ritesh078bct/SevaBot-A-RAG-based-nepali-chatbot.git
cd SevaBot-A-RAG-based-nepali-chatbot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-prod.txt
cp .env.example .env
```

Edit `.env` for production:
- `DEBUG=False`
- `ALLOWED_HOSTS=<your-domain>,<your-public-ip>`
- `CORS_ALLOWED_ORIGINS=https://<frontend-domain>`
- `CSRF_TRUSTED_ORIGINS=https://<frontend-domain>`
- `SECRET_KEY=<secure-random-value>`
- `GROQ_API_KEY=<your-key>`
- `LLAMAPARSE_API_KEY=<your-key-if-used>`

Then run:

```zsh
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 300
```

### Nginx reverse proxy

Create `/etc/nginx/sites-available/sevabot`:

```nginx
server {
    listen 80;
    server_name <your-domain-or-ip>;
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```zsh
sudo ln -s /etc/nginx/sites-available/sevabot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 2) Render (free tier)

> Suitable for quick deployment/demos. Free services can spin down and local file storage is not durable across restarts.

### Backend + Frontend from blueprint

1. Push this repository to GitHub.
2. In Render dashboard, choose **New > Blueprint**.
3. Select your repo; Render reads `render.yaml`.
4. Set required env vars:
   - `ALLOWED_HOSTS`
   - `CORS_ALLOWED_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`
   - `GROQ_API_KEY`
   - `LLAMAPARSE_API_KEY` (optional)
5. For static frontend service, set:
   - `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com/api`

---

## Frontend on Vercel (alternative)

If you deploy frontend separately on Vercel:

```zsh
cd frontend
npm install
npm run build
```

Set Vercel env var:
- `VITE_API_BASE_URL=https://<backend-domain>/api`

---

## Notes

- `requirements-prod.txt` is intentionally trimmed for production deploy reliability.
- Keep `db.sqlite3`, `media/`, and `chromadb_data/` on persistent disk (VM path).
- For higher reliability/scalability, migrate later to Postgres + managed vector DB.
