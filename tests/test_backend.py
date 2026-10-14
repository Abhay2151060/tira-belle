import unittest
import hashlib
import math

class TestTiraBelleBusinessLogic(unittest.TestCase):

    def test_credential_hashing(self):
        salt = 'TIRABELLE_SALT_2026'
        h = lambda s: hashlib.sha256((s + salt).encode('utf-8')).hexdigest()
        
        # Test known vector
        self.assertEqual(h('tirabelle123'), 'f2af6949747f4753b33ecc567ba642802ae0e95556ba8f865598d2c7e04cb630')
        self.assertEqual(h('1234'), '155f412e269b4f6d0d8a32c70e51824a482f2fce558d1b5b2175368ab2611af0')
        self.assertNotEqual(h('wrongpass'), h('tirabelle123'))

    def test_xss_escaping(self):
        def escape_html(s):
            if s is None:
                return ''
            return (str(s)
                    .replace('&', '&amp;')
                    .replace('<', '&lt;')
                    .replace('>', '&gt;')
                    .replace('"', '&quot;')
                    .replace("'", '&#39;'))

        self.assertEqual(escape_html('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;')
        self.assertEqual(escape_html('" onerror="exploit()'), '&quot; onerror=&quot;exploit()')
        self.assertEqual(escape_html("Tom & Jerry's"), 'Tom &amp; Jerry&#39;s')

    def calculate_loyalty(self, total_cups, claimed_rewards, threshold=5):
        total_earned = total_cups // threshold
        available = max(0, total_earned - claimed_rewards)
        is_eligible = available > 0
        progress = total_cups % threshold
        remaining = 0 if is_eligible else (threshold - progress)
        return {
            'threshold': threshold,
            'total_cups': total_cups,
            'total_earned': total_earned,
            'claimed': claimed_rewards,
            'available': available,
            'is_eligible': is_eligible,
            'progress': progress,
            'remaining': remaining
        }

    def test_loyalty_cycle_0_cups(self):
        res = self.calculate_loyalty(0, 0, 5)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['progress'], 0)
        self.assertEqual(res['remaining'], 5)

    def test_loyalty_cycle_3_cups(self):
        res = self.calculate_loyalty(3, 0, 5)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['progress'], 3)
        self.assertEqual(res['remaining'], 2)

    def test_loyalty_cycle_5_cups_eligible(self):
        res = self.calculate_loyalty(5, 0, 5)
        self.assertTrue(res['is_eligible'])
        self.assertEqual(res['available'], 1)
        self.assertEqual(res['remaining'], 0)

    def test_loyalty_cycle_5_cups_claimed(self):
        res = self.calculate_loyalty(5, 1, 5)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['available'], 0)
        self.assertEqual(res['progress'], 0)
        self.assertEqual(res['remaining'], 5)

    def test_loyalty_cycle_7_cups_1_claimed(self):
        # Rahul Verma scenario: Bought 7 cups total, claimed 1
        res = self.calculate_loyalty(7, 1, 5)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['progress'], 2)
        self.assertEqual(res['remaining'], 3)

    def test_loyalty_threshold_change(self):
        # Changing threshold to 4 dynamically updates rewards
        res4 = self.calculate_loyalty(7, 1, 4)
        self.assertEqual(res4['threshold'], 4)
        self.assertEqual(res4['progress'], 3)
        self.assertEqual(res4['remaining'], 1)

    def test_pos_financial_math(self):
        items = [
            {'price': 150, 'qty': 2}, # 300
            {'price': 220, 'qty': 2}  # 440
        ]
        subtotal = sum(i['price'] * i['qty'] for i in items)
        paid_cups = sum(i['qty'] for i in items)
        self.assertEqual(subtotal, 740)
        self.assertEqual(paid_cups, 4)

        # Cash vs Online tracking
        sales = [
            {'amount': 300, 'mode': 'Cash'},
            {'amount': 440, 'mode': 'Online'}
        ]
        cash = sum(s['amount'] for s in sales if s['mode'] == 'Cash')
        online = sum(s['amount'] for s in sales if s['mode'] == 'Online')
        total = sum(s['amount'] for s in sales)
        self.assertEqual(cash, 300)
        self.assertEqual(online, 440)
        self.assertEqual(total, 740)
        self.assertEqual(cash + online, total)

if __name__ == '__main__':
    unittest.main()
