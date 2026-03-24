# SevaBot Setup Guide

## ✅ Virtual Environment Setup Complete!

Your Python virtual environment has been successfully created and all dependencies have been installed.

## 📁 Project Structure

```
SevaBot-A-RAG-based-nepali-chatbot/
├── venv/                      # Virtual environment (newly created)
├── backend/                   # Backend application
├── chat/                      # Chat functionality
├── frontend/                  # Frontend application
├── permanent_knowledge/       # Knowledge base
├── manage.py                  # Django management script
├── requirements.txt           # Original requirements (includes Linux-only packages)
├── requirements_windows.txt   # Windows-compatible requirements
└── test_rag.py               # RAG testing script
```

## 🚀 How to Activate the Virtual Environment

### In PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

**Note:** If you get an execution policy error, run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Alternative (if activation fails):

You can run Python commands directly without activating:

```powershell
.\venv\Scripts\python.exe <your_script.py>
```

## 📦 Installed Packages

All packages from `requirements.txt` have been installed, with the following exceptions:

### Excluded Packages (Windows incompatible):

- `nvidia-cufile-cu12` - Linux-only CUDA library
- `nvidia-nvshmem-cu12` - Linux-only CUDA library
- `nvidia-nccl-cu12` - Linux-only CUDA library
- `cuda-bindings` - Linux-only
- `cuda-pathfinder` - Linux-only
- `triton` - Linux-only GPU programming library
- `uvloop` - Linux/macOS-only event loop

**Note:** These packages are not required for basic functionality on Windows. PyTorch will use the installed CUDA libraries that are Windows-compatible.

## 🔧 Key Installed Components

- **Django 6.0.1** - Web framework
- **PyTorch 2.10.0** - Deep learning framework
- **Transformers 5.0.0** - Hugging Face transformers
- **Sentence Transformers 5.2.2** - Sentence embeddings
- **ChromaDB 1.4.1** - Vector database
- **LlamaIndex 0.14.13** - RAG framework
- **CUDA Libraries** - GPU acceleration support

## 🎯 Next Steps

1. **Activate the virtual environment:**

   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. **Run Django migrations:**

   ```powershell
   python manage.py migrate
   ```

3. **Create a superuser (optional):**

   ```powershell
   python manage.py createsuperuser
   ```

4. **Run the development server:**

   ```powershell
   python manage.py runserver
   ```

5. **Test the RAG system:**
   ```powershell
   python test_rag.py
   ```

## 🐛 Troubleshooting

### If you encounter CUDA errors:

- The CUDA libraries are installed but require an NVIDIA GPU with CUDA support
- If you don't have a compatible GPU, PyTorch will automatically fall back to CPU mode

### If packages are missing:

- Install from the Windows-compatible requirements:
  ```powershell
  .\venv\Scripts\python.exe -m pip install -r requirements_windows.txt
  ```

### To update a specific package:

```powershell
.\venv\Scripts\python.exe -m pip install --upgrade <package_name>
```

## 📝 Environment Information

- **Python Version:** 3.13.7
- **Virtual Environment:** `venv` (located in project root)
- **Requirements File:** `requirements_windows.txt` (Windows-compatible)
- **Total Packages Installed:** 150+ packages

## 💡 Tips

- Always activate the virtual environment before working on the project
- Use `requirements_windows.txt` for future installations on Windows
- The original `requirements.txt` is preserved for reference and Linux deployments
- To deactivate the virtual environment, simply run: `deactivate`

---

**Happy Coding! 🎉**
