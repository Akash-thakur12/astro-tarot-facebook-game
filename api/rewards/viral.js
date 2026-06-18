import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp(); // Relies on env vars set by Vercel/Firebase
}

const db = getFirestore();
const adminAuth = getAuth();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { action } = req.body;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userRef = db.collection('users').doc(uid);
  try {
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error('USER_NOT_FOUND');
      const data = doc.data();
      const now = new Date();

      if (action === 'share') {
        const lastShare = data.lastShareDate?.toDate();
        if (lastShare && lastShare.getUTCDate() === now.getUTCDate() && lastShare.getUTCMonth() === now.getUTCMonth() && lastShare.getUTCFullYear() === now.getUTCFullYear()) {
          return { success: false, error: 'ALREADY_CLAIMED_TODAY' };
        }
        t.update(userRef, { coins: FieldValue.increment(10), lastShareDate: FieldValue.serverTimestamp() });
        return { success: true, reward: 10 };
      } else if (action === 'invite') {
        const lastInvite = data.lastInviteDate?.toDate();
        if (lastInvite && lastInvite.getUTCDate() === now.getUTCDate() && lastInvite.getUTCMonth() === now.getUTCMonth() && lastInvite.getUTCFullYear() === now.getUTCFullYear()) {
          return { success: false, error: 'ALREADY_CLAIMED_TODAY' };
        }
        t.update(userRef, { coins: FieldValue.increment(20), lastInviteDate: FieldValue.serverTimestamp() });
        return { success: true, reward: 20 };
      } else {
        return { success: false, error: 'INVALID_ACTION' };
      }
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
