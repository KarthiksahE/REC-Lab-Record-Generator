import subprocess
import os
import shutil
import platform
import logging

logger = logging.getLogger(__name__)

def find_libreoffice() -> str:
    """
    Attempts to locate the LibreOffice 'soffice' executable.
    Checks environment variable, common paths, and system PATH.
    """
    # 1. Check environment variable
    env_path = os.getenv("LIBREOFFICE_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. Check common paths depending on the OS
    system_os = platform.system()
    if system_os == "Windows":
        common_paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
        ]
        for path in common_paths:
            if os.path.exists(path):
                return path
    elif system_os == "Darwin": # macOS
        mac_path = "/Applications/LibreOffice.app/Contents/MacOS/soffice"
        if os.path.exists(mac_path):
            return mac_path
    else: # Linux/Unix
        linux_paths = [
            "/usr/bin/libreoffice",
            "/usr/bin/soffice",
            "/usr/local/bin/soffice"
        ]
        for path in linux_paths:
            if os.path.exists(path):
                return path

    # 3. Try to locate via system PATH
    path_executable = shutil.which("soffice")
    if path_executable:
        return path_executable
        
    return ""

def convert_docx_to_pdf(docx_path: str, output_dir: str) -> str:
    """
    Converts a DOCX file to a PDF file using headless LibreOffice.
    
    Args:
        docx_path (str): Absolute path to the source DOCX file.
        output_dir (str): Absolute path to the output directory.
        
    Returns:
        str: Absolute path to the generated PDF file.
    """
    if not os.path.exists(docx_path):
        raise FileNotFoundError(f"Source DOCX file not found: {docx_path}")
        
    os.makedirs(output_dir, exist_ok=True)
    
    # Locate LibreOffice
    libreoffice_bin = find_libreoffice()
    if not libreoffice_bin:
        raise FileNotFoundError(
            "LibreOffice 'soffice' executable could not be located. "
            "Please install LibreOffice and configure 'LIBREOFFICE_PATH' in your environment or .env file."
        )
        
    logger.info(f"Using LibreOffice at: {libreoffice_bin}")
    
    # Prepare command
    cmd = [
        libreoffice_bin,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        output_dir,
        docx_path
    ]
    
    try:
        # Run conversion process
        # On Windows, we use shell=True if the executable needs to run in CMD context,
        # but passing list arguments directly is safer and works on standard installations.
        # We specify stdout/stderr capture.
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60 # Set a 60 second timeout for safety
        )
        
        if result.returncode != 0:
            raise RuntimeError(
                f"LibreOffice conversion failed (exit code {result.returncode}): {result.stderr}"
            )
            
        # Determine expected output path
        base_name = os.path.splitext(os.path.basename(docx_path))[0]
        pdf_path = os.path.join(output_dir, f"{base_name}.pdf")
        
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(
                f"LibreOffice completed successfully but PDF file was not created at expected location: {pdf_path}"
            )
            
        return pdf_path
        
    except subprocess.TimeoutExpired as te:
        raise RuntimeError("LibreOffice PDF conversion timed out after 60 seconds") from te
    except Exception as e:
        raise RuntimeError(f"Failed to convert DOCX to PDF using LibreOffice: {str(e)}") from e
