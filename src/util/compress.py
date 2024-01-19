import os
import zipfile
from io import BytesIO


def zip_directory_recurse(io: BytesIO, output_dir: str) -> bytes:
    secrets_dir = os.path.join(output_dir, "secrets")
    with zipfile.ZipFile(io, mode="w", compression=zipfile.ZIP_DEFLATED) as out_zip:
        for subdir, dirs, files in os.walk(output_dir):
            for file in files:
                if subdir == secrets_dir:
                    continue  # skip secrets
                srcpath = os.path.join(subdir, file)
                dstpath_in_zip = os.path.relpath(srcpath, start=output_dir)
                with open(srcpath, "rb") as infile:
                    out_zip.writestr(dstpath_in_zip, infile.read())
    return io.getvalue()
