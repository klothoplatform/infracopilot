import logging
import sys

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

logger.info("This is a log info message.")
