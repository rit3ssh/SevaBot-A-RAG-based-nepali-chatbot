# SevaBot - Quick Start Guide

## 🚀 Your Server is Running!

Your Django development server is currently running at: **http://127.0.0.1:8000/**

## ⚠️ Important: Apply Migrations First

You have **26 unapplied migrations** that need to be applied. Follow these steps:

### Step 1: Stop the Server

Press `CTRL+C` or `CTRL+BREAK` in the terminal where the server is running.

### Step 2: Apply Migrations

Run this command:

```powershell
.\venv\Scripts\python.exe manage.py migrate
```

This will set up the database tables for:

- `admin` - Django admin interface
- `auth` - User authentication
- `authtoken` - API token authentication
- `chat` - Your chat application
- `contenttypes` - Django content types
- `sessions` - Session management

### Step 3: Create a Superuser (Optional but Recommended)

```powershell
.\venv\Scripts\python.exe manage.py createsuperuser
```

Follow the prompts to create an admin account.

### Step 4: Restart the Server

```powershell
.\venv\Scripts\python.exe manage.py runserver
```

## 📋 Common Commands

### Running the Server

```powershell
# Start development server
.\venv\Scripts\python.exe manage.py runserver

# Start on a different port
.\venv\Scripts\python.exe manage.py runserver 8080

# Make it accessible from other devices on your network
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

### Database Management

```powershell
# Apply migrations
.\venv\Scripts\python.exe manage.py migrate

# Create new migrations after model changes
.\venv\Scripts\python.exe manage.py makemigrations

# Show migration status
.\venv\Scripts\python.exe manage.py showmigrations
```

### Admin & Users

```powershell
# Create superuser
.\venv\Scripts\python.exe manage.py createsuperuser

# Change user password
.\venv\Scripts\python.exe manage.py changepassword <username>
```

### Django Shell

```powershell
# Open Django shell for testing
.\venv\Scripts\python.exe manage.py shell
```

### Testing

```powershell
# Run tests
.\venv\Scripts\python.exe manage.py test

# Test the RAG system
.\venv\Scripts\python.exe test_rag.py
```

## 🌐 Access Points

After starting the server, you can access:

- **Main Application**: http://127.0.0.1:8000/
- **Admin Panel**: http://127.0.0.1:8000/admin/
- **API Endpoints**: Check your `urls.py` for available endpoints

## 🔍 Checking Installation

```powershell
# Check Django version
.\venv\Scripts\python.exe -m django --version

# Check installed packages
.\venv\Scripts\python.exe -m pip list

# Check Python version
.\venv\Scripts\python.exe --version
```

## 🐛 Troubleshooting

### Port Already in Use

If port 8000 is already in use:

```powershell
.\venv\Scripts\python.exe manage.py runserver 8080
```

### Database Locked

If you get a database locked error, make sure no other instance of the server is running.

### Static Files Not Loading

```powershell
.\venv\Scripts\python.exe manage.py collectstatic
```

## 📝 Next Steps

1. ✅ Stop the current server (`CTRL+C`)
2. ✅ Run migrations: `.\venv\Scripts\python.exe manage.py migrate`
3. ✅ Create superuser: `.\venv\Scripts\python.exe manage.py createsuperuser`
4. ✅ Restart server: `.\venv\Scripts\python.exe manage.py runserver`
5. ✅ Visit http://127.0.0.1:8000/ in your browser
6. ✅ Login to admin at http://127.0.0.1:8000/admin/

---

**Happy Coding! 🎊**
