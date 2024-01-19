import aiounittest
from unittest.mock import patch, MagicMock
from src.engine_service.binaries.fetcher import (
    Binary,
    BinaryNotFoundException,
    BinaryStorage,
)


class TestBinaryStorage(aiounittest.AsyncTestCase):
    @patch("src.engine_service.binaries.fetcher.get_object")
    def test_get_binary(self, mock_get_object):
        # Arrange
        mock_bucket = MagicMock()
        mock_object = MagicMock()
        mock_bucket.Object.return_value = mock_object
        mock_get_object.return_value = "mock_binary_raw"
        binary_storage = BinaryStorage(mock_bucket)

        # Act
        result = binary_storage.get_binary(Binary.ENGINE)

        # Assert
        self.assertEqual(result.getvalue(), b"mock_binary_raw")
        mock_bucket.Object.assert_called_with("engine")
        mock_get_object.assert_called_with(mock_object)

    @patch("src.engine_service.binaries.fetcher.get_object")
    def test_get_binary_not_found(self, mock_get_object):
        # Arrange
        mock_bucket = MagicMock()
        mock_bucket.Object.return_value = "mock_object"
        mock_get_object.return_value = None
        binary_storage = BinaryStorage(mock_bucket)

        # Act & Assert
        with self.assertRaises(BinaryNotFoundException):
            binary_storage.get_binary(Binary.ENGINE)

    @patch("src.engine_service.binaries.fetcher.get_object")
    @patch("src.engine_service.binaries.fetcher.Path")
    @patch("src.engine_service.binaries.fetcher.os")
    def test_ensure_binary(self, mock_os, mock_path, mock_get_object):
        # Arrange
        mock_bucket = MagicMock()
        mock_object = MagicMock()
        mock_file = MagicMock()
        mock_bucket.Object.return_value = mock_object
        mock_get_object.return_value = "mock_binary_raw"

        mock_os.chmod.return_value = None
        binary_storage = BinaryStorage(mock_bucket)

        mock_binary = MagicMock()
        mock_binary.path.exists.return_value = False
        mock_binary.path.parent.mkdir.return_value = None
        mock_binary.path.open.return_value = mock_file
        # Act
        binary_storage.ensure_binary(mock_binary)

        # Assert
        mock_binary.path.exists.call_count == 2
        mock_binary.path.parent.mkdir.assert_called_once()
        mock_binary.path.open.assert_called_once()
        mock_file.__enter__().write.assert_called()
        mock_os.chmod.assert_called_with(mock_binary.path, 0o755)
