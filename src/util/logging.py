import logging
import os
import sys
import time

app_log_file = os.getenv("APP_LOG_FILE", None)

# Create a custom logger
logger = logging.getLogger(__name__)

# Create handlers and formatters
c_handler = logging.StreamHandler(sys.stdout)
file_handler = None

c_format = logging.Formatter(
    "%(name)s - %(pathname)s - %(lineno)d - %(levelname)s - %(asctime)s - %(message)s"
)
c_handler.setFormatter(c_format)

log_handlers = [c_handler]
if app_log_file is not None:
    file_handler = logging.FileHandler(app_log_file)
    file_handler.setFormatter(c_format)
    log_handlers.append(file_handler)

# Add handlers to the logger
logger.handlers = log_handlers
logger.setLevel(logging.DEBUG)


def log_time(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        # logger.debug(f"Starting function '{func.__name__}'")

        result = func(*args, **kwargs)

        end_time = time.time()
        elapsed_time = end_time - start_time
        # logger.debug(f"Function '{func.__name__}' took {elapsed_time} seconds")

        return result

    return wrapper
