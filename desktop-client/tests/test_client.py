import pathlib
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
import client

class ClientTests(unittest.TestCase):
    def test_url_policy(self):
        self.assertEqual(client.validate_server_url('http://127.0.0.1:8080/'),'http://127.0.0.1:8080')
        self.assertEqual(client.validate_server_url('https://exam.example'),'https://exam.example')
        for url in ('http://public.example','file:///tmp','https://x/y','https://user:pw@site.test'):
            with self.assertRaises(ValueError):client.validate_server_url(url)
    def test_privacy_name(self):
        self.assertEqual(client.normalized_app('Firefox.exe'),'Firefox.exe')
        self.assertIsNone(client.normalized_app('msg\nsecret'))
        self.assertEqual(len(client.normalized_app('x'*200)),160)
    def test_event_fields(self):
        ev=client.make_event('foreground_app','Firefox.exe')
        self.assertEqual(set(ev),{'id','kind','app_name'})
        self.assertNotIn('screenshot',ev)
    def test_wayland_unsupported(self):
        with patch.object(client.platform,'system',return_value='Linux'),patch.dict('os.environ',{'XDG_SESSION_TYPE':'wayland'}):
            name,warning=client.foreground_windows()
            self.assertIsNone(name)
            self.assertIn('Wayland',warning)
    def test_in_memory_bounded_buffer(self):
        worker=client.MonitorWorker('https://example.test','x',None,None)
        for i in range(120):worker.add('foreground_app',str(i))
        self.assertEqual(len(worker.buffer),100)
        self.assertEqual(worker.buffer[0]['app_name'],'20')

if __name__ == '__main__': unittest.main()
