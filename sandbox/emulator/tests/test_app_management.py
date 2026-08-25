import json
import tempfile
import unittest

from app.adapter.client import AVDApp, App
from app.routers import emulators
from app.schemas import ListAppsBatchRequest


class _FakeAdb:
    def __init__(self, connect_info):
        self._connect_info = connect_info

    def get_connect_info(self):
        return self._connect_info


class _FakeClient:
    def __init__(
        self,
        *,
        connect_info=("127.0.0.1", 16384),
        metadata=None,
        metadata_error=None,
        packages=None,
    ):
        self.adb = _FakeAdb(connect_info)
        self.metadata = metadata or {}
        self.metadata_error = metadata_error
        self.packages = packages or {"-3": [], "-s": []}
        self.mumu_commands = []
        self.adb_commands = []

    def _run_command(self, operate, args):
        self.mumu_commands.append((operate, args))
        if self.metadata_error:
            return 1, "", self.metadata_error
        return 0, json.dumps(self.metadata), ""

    def _run_adb(self, args):
        self.adb_commands.append(args)
        if args[0] == "connect":
            return 0, "connected", ""
        package_lines = [
            f"package:{package}" for package in self.packages.get(args[-1], [])
        ]
        return 0, "\n".join(package_lines), ""


class AppManagementTests(unittest.TestCase):
    def test_user_filter_queries_only_third_party_packages(self):
        client = _FakeClient(
            metadata={"com.example.user": {"app_name": "Example", "version": "1.0"}},
            packages={"-3": ["com.example.user"], "-s": ["android"]},
        )

        apps = App(client).get_installed(app_filter="user")

        pm_commands = [command for command in client.adb_commands if "pm" in command]
        self.assertEqual([command[-1] for command in pm_commands], ["-3"])
        self.assertEqual(
            apps,
            [
                {
                    "package": "com.example.user",
                    "app_name": "Example",
                    "version": "1.0",
                    "is_system": False,
                }
            ],
        )

    def test_all_filter_marks_system_and_user_packages(self):
        client = _FakeClient(
            metadata={"com.example.user": {"app_name": "Example", "version": "1.0"}},
            packages={"-3": ["com.example.user"], "-s": ["android"]},
        )

        apps = App(client).get_installed(app_filter="all")

        app_by_package = {app["package"]: app for app in apps}
        self.assertFalse(app_by_package["com.example.user"]["is_system"])
        self.assertTrue(app_by_package["android"]["is_system"])

    def test_explicit_adb_serial_ignores_mumu_metadata_error(self):
        client = _FakeClient(
            connect_info=(None, None),
            metadata_error='{"errcode": -201, "errmsg": "unknown error"}',
            packages={"-3": ["com.example.user"], "-s": ["android"]},
        )

        apps = App(client).get_installed(
            app_filter="all",
            adb_serial="127.0.0.1:16416",
        )

        app_by_package = {app["package"]: app for app in apps}
        self.assertFalse(app_by_package["com.example.user"]["is_system"])
        self.assertTrue(app_by_package["android"]["is_system"])
        self.assertIn(["connect", "127.0.0.1:16416"], client.adb_commands)

    def test_avd_get_installed_connects_explicit_host_port_serial(self):
        client = _FakeClient(
            connect_info=(None, None),
            packages={"-3": ["com.example.user"], "-s": ["android"]},
        )

        apps = AVDApp(client).get_installed(
            app_filter="user",
            adb_serial="127.0.0.1:5554",
        )

        self.assertEqual([app["package"] for app in apps], ["com.example.user"])
        self.assertIn(["connect", "127.0.0.1:5554"], client.adb_commands)

    def test_install_falls_back_to_explicit_adb_serial(self):
        client = _FakeClient(
            connect_info=(None, None),
            metadata_error='{"errcode": -201, "errmsg": "unknown error"}',
        )

        with tempfile.NamedTemporaryFile(suffix=".apk") as apk_file:
            App(client).install(apk_file.name, adb_serial="127.0.0.1:16416")

        self.assertIn(["connect", "127.0.0.1:16416"], client.adb_commands)
        self.assertTrue(
            any(
                command[:4] == ["-s", "127.0.0.1:16416", "install", "-r"]
                for command in client.adb_commands
            )
        )

    def test_uninstall_falls_back_to_explicit_adb_serial(self):
        client = _FakeClient(
            connect_info=(None, None),
            metadata_error='{"errcode": -201, "errmsg": "unknown error"}',
        )

        App(client).uninstall("com.example.user", adb_serial="127.0.0.1:16416")

        self.assertIn(["connect", "127.0.0.1:16416"], client.adb_commands)
        self.assertIn(
            ["-s", "127.0.0.1:16416", "uninstall", "com.example.user"],
            client.adb_commands,
        )

    def test_launch_falls_back_to_explicit_adb_serial(self):
        client = _FakeClient(
            connect_info=(None, None),
            metadata_error='{"errcode": -201, "errmsg": "unknown error"}',
        )

        App(client).launch("com.example.user", adb_serial="127.0.0.1:16416")

        self.assertIn(["connect", "127.0.0.1:16416"], client.adb_commands)
        self.assertTrue(
            any(
                command[:5] == ["-s", "127.0.0.1:16416", "shell", "monkey", "-p"]
                and "com.example.user" in command
                for command in client.adb_commands
            ),
            f"launch fallback monkey command missing: {client.adb_commands}",
        )

    def test_close_falls_back_to_explicit_adb_serial(self):
        client = _FakeClient(
            connect_info=(None, None),
            metadata_error='{"errcode": -201, "errmsg": "unknown error"}',
        )

        App(client).close("com.example.user", adb_serial="127.0.0.1:16416")

        self.assertIn(["connect", "127.0.0.1:16416"], client.adb_commands)
        self.assertIn(
            ["-s", "127.0.0.1:16416", "shell", "am", "force-stop", "com.example.user"],
            client.adb_commands,
        )

    def test_system_filter_requires_adb_transport(self):
        client = _FakeClient(connect_info=(None, None))

        with self.assertRaisesRegex(RuntimeError, "system app listing requires ADB"):
            App(client).get_installed(app_filter="system")

        self.assertEqual(client.mumu_commands, [])

    def test_user_filter_falls_back_to_mumu_metadata_without_adb(self):
        client = _FakeClient(
            connect_info=(None, None),
            metadata={"com.example.user": {"app_name": "Example", "version": "1.0"}},
        )

        apps = App(client).get_installed(app_filter="user")

        self.assertEqual(
            apps,
            [
                {
                    "package": "com.example.user",
                    "app_name": "Example",
                    "version": "1.0",
                    "is_system": False,
                }
            ],
        )

    def test_batch_runner_preserves_order_and_captures_crashes(self):
        def worker(index):
            if index == 2:
                raise ValueError("boom")
            return {"index": index, "status": "success"}

        with self.assertLogs(emulators._LOGGER, level="ERROR"):
            results = emulators._run_index_batch(
                [3, 2, 1],
                2,
                worker,
                lambda index, exc: {
                    "index": index,
                    "status": "failed",
                    "error_message": str(exc),
                },
                "test",
            )

        self.assertEqual([result["index"] for result in results], [3, 2, 1])
        self.assertEqual(results[1]["status"], "failed")
        self.assertEqual(results[1]["error_message"], "boom")

    def test_batch_summary_reports_partial(self):
        status_text, succeeded, failed = emulators._summarize_batch_results(
            [{"status": "installed"}, {"status": "failed"}],
            "installed",
        )

        self.assertEqual(status_text, "partial")
        self.assertEqual(succeeded, 1)
        self.assertEqual(failed, 1)

    def test_batch_schema_rejects_negative_device_index(self):
        with self.assertRaises(ValueError):
            ListAppsBatchRequest(indices=[-1])

    def test_batch_schema_rejects_invalid_app_filter(self):
        with self.assertRaises(ValueError):
            ListAppsBatchRequest(indices=[1], app_filter="third_party")

    def test_install_url_does_not_filter_address_classes(self):
        urls = [
            "http://127.0.0.1:8080/storage/app.apk",
            "http://10.0.0.5:8080/app.apk",
            "http://169.254.1.1/app.apk",
            "http://224.0.0.1/app.apk",
            "http://240.0.0.1/app.apk",
            "http://0.0.0.0/app.apk",
            "http://[::1]/app.apk",
        ]

        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(emulators._validate_install_url(url).geturl(), url)

    def test_install_url_does_not_pre_resolve_hostname(self):
        url = "http://unresolvable.internal/app.apk"

        self.assertEqual(emulators._validate_install_url(url).geturl(), url)


if __name__ == "__main__":
    unittest.main()
