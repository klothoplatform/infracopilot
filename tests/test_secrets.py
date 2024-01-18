from unittest import TestCase, mock

from src.util.secrets import (
    get_fga_model,
    get_fga_secret,
    get_fga_client,
    get_fga_store,
    get_auth0_client,
)

mock_file_content = "test"


class TestSecrets(TestCase):
    @mock.patch(
        "builtins.open",
        new=mock.mock_open(read_data=mock_file_content),
        create=True,
    )
    def test_get_fga_secret(self):
        self.assertEqual(get_fga_secret(), mock_file_content)

    @mock.patch(
        "builtins.open",
        new=mock.mock_open(read_data=mock_file_content),
        create=True,
    )
    def test_get_fga_client(self):
        self.assertEqual(get_fga_client(), mock_file_content)

    @mock.patch(
        "builtins.open",
        new=mock.mock_open(read_data=mock_file_content),
        create=True,
    )
    def test_get_fga_store(self):
        self.assertEqual(get_fga_store(), mock_file_content)

    @mock.patch(
        "builtins.open",
        new=mock.mock_open(read_data=mock_file_content),
        create=True,
    )
    def test_get_fga_model(self):
        self.assertEqual(get_fga_model(), mock_file_content)

    @mock.patch(
        "builtins.open",
        new=mock.mock_open(read_data=mock_file_content),
        create=True,
    )
    def test_get_auth0_client(self):
        self.assertEqual(get_auth0_client(), mock_file_content)

    @mock.patch(
        "builtins.open",
        new=mock.mock_open(read_data=mock_file_content),
        create=True,
    )
    def test_get_auth0_secret(self):
        self.assertEqual(get_auth0_client(), mock_file_content)

    @mock.patch(
        "builtins.open",
        side_effect=Exception,
        create=True,
    )
    def test_get_fga_secret_failure(self, _):
        self.assertIsNone(get_fga_secret())

    @mock.patch(
        "builtins.open",
        side_effect=Exception,
        create=True,
    )
    def test_get_fga_client_failure(self, _):
        self.assertIsNone(get_fga_client())

    @mock.patch(
        "builtins.open",
        side_effect=Exception,
        create=True,
    )
    def test_get_fga_store_failure(self, _):
        self.assertIsNone(get_fga_store())

    @mock.patch(
        "builtins.open",
        side_effect=Exception,
        create=True,
    )
    def test_get_fga_model_failure(self, _):
        self.assertIsNone(get_fga_model())

    @mock.patch(
        "builtins.open",
        side_effect=Exception,
        create=True,
    )
    def test_get_auth0_client_failure(self, _):
        self.assertIsNone(get_auth0_client())

    @mock.patch(
        "builtins.open",
        side_effect=Exception,
        create=True,
    )
    def test_get_auth0_secret_failure(self, _):
        self.assertIsNone(get_fga_secret())
