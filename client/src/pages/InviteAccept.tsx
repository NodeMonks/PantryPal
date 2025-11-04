import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function InviteAccept() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const token = sp.get('token') || '';

  useEffect(() => {
    if (!token) setError('Missing invite token');
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    const res = await fetch('/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data?.error || 'Failed to accept invite');
    setSuccess('Invite accepted. You can now log in.');
    setTimeout(() => navigate('/login'), 1200);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 mb-2 text-sm">{error}</div>}
          {success && <div className="text-green-700 mb-2 text-sm">{success}</div>}
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-sm">New Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
            </div>
            <div>
              <label className="text-sm">Confirm Password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="********" />
            </div>
            <Button type="submit" className="w-full">Set Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
