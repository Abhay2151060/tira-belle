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

    def calculate_loyalty(self, completed_purchases, claimed_rewards, threshold=5, total_cups=None):
        if total_cups is None:
            total_cups = completed_purchases
        total_earned = completed_purchases // threshold
        available = max(0, total_earned - claimed_rewards)
        is_eligible = available > 0
        purchases_since_claimed = max(0, completed_purchases - (claimed_rewards * threshold))
        progress = threshold if is_eligible else (purchases_since_claimed % threshold)
        remaining = 0 if is_eligible else (threshold - progress)
        return {
            'threshold': threshold,
            'total_cups': total_cups,
            'completed_purchases': completed_purchases,
            'total_earned': total_earned,
            'claimed': claimed_rewards,
            'available': available,
            'is_eligible': is_eligible,
            'progress': progress,
            'remaining': remaining
        }

    def test_loyalty_cycle_0_purchases(self):
        res = self.calculate_loyalty(0, 0, 5)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['progress'], 0)
        self.assertEqual(res['remaining'], 5)

    def test_loyalty_cycle_3_purchases(self):
        res = self.calculate_loyalty(3, 0, 5)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['progress'], 3)
        self.assertEqual(res['remaining'], 2)

    def test_loyalty_multi_cup_single_transaction(self):
        # Purchasing 4 cups in 1 single transaction still counts as 1 purchase
        res = self.calculate_loyalty(completed_purchases=1, claimed_rewards=0, threshold=5, total_cups=4)
        self.assertEqual(res['total_cups'], 4)
        self.assertEqual(res['completed_purchases'], 1)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['progress'], 1)
        self.assertEqual(res['remaining'], 4)

    def test_loyalty_cycle_5_purchases_eligible(self):
        # Jay scenario: 5 completed transactions, total 8 cups bought, 0 claimed
        res = self.calculate_loyalty(completed_purchases=5, claimed_rewards=0, threshold=5, total_cups=8)
        self.assertTrue(res['is_eligible'])
        self.assertEqual(res['available'], 1)
        self.assertEqual(res['claimed'], 0)
        self.assertEqual(res['remaining'], 0)
        self.assertEqual(res['progress'], 5)

    def test_loyalty_cycle_5_purchases_claimed(self):
        # Jay redeems his reward: claimed becomes 1, progress resets to 0/5
        res = self.calculate_loyalty(completed_purchases=5, claimed_rewards=1, threshold=5, total_cups=8)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['available'], 0)
        self.assertEqual(res['claimed'], 1)
        self.assertEqual(res['progress'], 0)
        self.assertEqual(res['remaining'], 5)

    def test_loyalty_cycle_7_purchases_1_claimed(self):
        # Rahul Verma scenario: 7 completed transactions, total 12 cups, 1 claimed
        res = self.calculate_loyalty(completed_purchases=7, claimed_rewards=1, threshold=5, total_cups=12)
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['claimed'], 1)
        self.assertEqual(res['progress'], 2)
        self.assertEqual(res['remaining'], 3)

    def test_loyalty_threshold_change(self):
        # Changing threshold to 6: 5 transactions is no longer eligible (needs 1 more)
        res6 = self.calculate_loyalty(completed_purchases=5, claimed_rewards=0, threshold=6, total_cups=8)
        self.assertFalse(res6['is_eligible'])
        self.assertEqual(res6['threshold'], 6)
        self.assertEqual(res6['progress'], 5)
        self.assertEqual(res6['remaining'], 1)

        # 7 transactions with 1 claimed at threshold 6 -> 7 - 6 = 1 -> 1/6 progress
        res7 = self.calculate_loyalty(completed_purchases=7, claimed_rewards=1, threshold=6, total_cups=12)
        self.assertEqual(res7['progress'], 1)
        self.assertEqual(res7['remaining'], 5)

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

    def test_customer_filtering(self):
        # Sample customers and their transactions
        customers = [
            {'phone': '111', 'name': 'Jay'},
            {'phone': '222', 'name': 'Priya'},
            {'phone': '333', 'name': 'Rahul'},
            {'phone': '444', 'name': 'Aisha'}
        ]
        sales = [
            {'customerPhone': '111', 'paymentMode': 'Cash', 'items': [{'productName': 'Tiramisu 150g'}]},
            {'customerPhone': '111', 'paymentMode': 'Online', 'items': [{'productName': 'Tiramisu 350g'}]},
            {'customerPhone': '222', 'paymentMode': 'Online', 'items': [{'productName': 'Tiramisu 150g'}, {'productName': 'Tiramisu 350g'}]},
            {'customerPhone': '333', 'paymentMode': 'Cash', 'items': [{'productName': 'Tiramisu 150g'}]},
            {'customerPhone': '444', 'paymentMode': 'Cash', 'items': [{'productName': 'Tiramisu 150g'}]}
        ]
        redemptions = [
            {'customerPhone': '333', 'rewardItem': '1 Free 150g Tiramisu'}
        ]

        # Test Cash filter
        cash_phones = {s['customerPhone'] for s in sales if s['paymentMode'] == 'Cash'}
        self.assertEqual(cash_phones, {'111', '333', '444'})

        # Test Online filter
        online_phones = {s['customerPhone'] for s in sales if s['paymentMode'] == 'Online'}
        self.assertEqual(online_phones, {'111', '222'})

        # Test 150g filter
        p150_phones = {s['customerPhone'] for s in sales if any('150' in it['productName'] for it in s['items'])}
        self.assertEqual(p150_phones, {'111', '222', '333', '444'})

        # Test 350g filter
        p350_phones = {s['customerPhone'] for s in sales if any('350' in it['productName'] for it in s['items'])}
        self.assertEqual(p350_phones, {'111', '222'})

        # Test Offer Claimed filter
        claimed_phones = {r['customerPhone'] for r in redemptions}
        self.assertEqual(claimed_phones, {'333'})

    def test_business_settings_defaults(self):
        default_settings = {
            'businessName': 'TIRA Belle',
            'tagline': 'Little Layers • Big Love',
            'slogan': 'Layers of Love in Every Spoon',
            'owner': 'Yash Chauhan & Tejas Chauhan',
            'phone': '9373484198',
            'phoneSecondary': '8484870543',
            'whatsapp': '9373484198',
            'address': 'Physical Dessert Studio & Artisan Counter, Pune',
            'email': 'tirabelle.desserts@gmail.com',
            'instagram': '@tirabelle',
            'upiId': '9373484198@upi',
            'currency': '₹',
            'loyaltyThreshold': 5,
            'rewardItemName': '1 Free 150g Tiramisu Cup',
            'logo': 'assets/tira-belle-logo.png'
        }
        self.assertIn('logo', default_settings)
        self.assertIn('owner', default_settings)
        self.assertIn('phoneSecondary', default_settings)
        self.assertIn('email', default_settings)
        self.assertIn('instagram', default_settings)
        self.assertTrue(default_settings['logo'].endswith('.png'))

    def test_business_settings_update_and_merge(self):
        initial = {
            'businessName': 'TIRA Belle',
            'logo': 'assets/tira-belle-logo.png',
            'phone': '9373484198'
        }
        updates = {
            'businessName': 'TIRA Belle Artisanal',
            'logo': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'phoneSecondary': '8484870543'
        }
        merged = {**initial, **updates}
        self.assertEqual(merged['businessName'], 'TIRA Belle Artisanal')
        self.assertTrue(merged['logo'].startswith('data:image/png;base64,'))
        self.assertEqual(merged['phone'], '9373484198')
        self.assertEqual(merged['phoneSecondary'], '8484870543')

if __name__ == '__main__':
    unittest.main()


