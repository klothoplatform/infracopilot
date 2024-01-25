import logging
import sys
import time

# Create a custom logger
logger = logging.getLogger(__name__)

# Create handlers
c_handler = logging.StreamHandler(sys.stdout)
file_handler = logging.FileHandler("app.log")


# Create formatters and add it to handlers
c_format = logging.Formatter(
    "%(name)s - %(pathname)s - %(lineno)d - %(levelname)s - %(asctime)s - %(message)s"
)
c_handler.setFormatter(c_format)
file_handler.setFormatter(c_format)

# Add handlers to the logger
logger.handlers = [c_handler, file_handler]
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
