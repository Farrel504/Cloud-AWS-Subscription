import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

const LoginPage2: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkSessionExpiration = () => {
            const storedSessionToken = localStorage.getItem('session_token');
            const storedSessionExpiration = localStorage.getItem('session_expiration'); 

            if (storedSessionToken && storedSessionExpiration) {
                const currentTime = Math.floor(Date.now() / 1000); 

                if (currentTime >= parseInt(storedSessionExpiration, 10)) {
                    console.log("Session has expired. Logging out...");
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('session_expiration');
                    alert('Your session has expired. Please log in again.');
                    router.push('/');
                }
            }
        };

        checkSessionExpiration();
        const interval = setInterval(checkSessionExpiration, 60000); 

        return () => clearInterval(interval);
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await axios.post(
                'https://1kxyg811y3.execute-api.us-east-1.amazonaws.com/Test/loginFunction2',
                JSON.stringify({ email, password }),
                {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    validateStatus: (status) => status < 500 
                }
            );

            console.log('Response11:', response.data);

            let responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            if (responseData.body && typeof responseData.body === 'string') {
                responseData = JSON.parse(responseData.body);
            }

            console.log('Parsed Response:', responseData);

            if (responseData.success === true) {
                if (responseData.session_token) {
                    localStorage.setItem('session_token', responseData.session_token);

                    
                    const sessionExpiration = Math.floor(Date.now() / 1000) + 3600; 
                    localStorage.setItem('session_expiration', sessionExpiration.toString());

                    console.log('Token saved to localStorage:', localStorage.getItem('session_token'));
                    console.log('Expiration saved to localStorage:', localStorage.getItem('session_expiration'));

                    setTimeout(() => {
                        router.push('/mainPage');
                    }, 200); 
                } else {
                    console.error('No session token or expiration time received from server.');
                }
            } else {
                setError(responseData.message || 'Email or password is invalid.');
            }

        } catch (error: any) {
            console.error('Error:', error.message);
            setError('An unexpected error occurred.');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-80">
                <h2 className="text-2xl mb-4">Login</h2>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                <div className="mb-4">
                    <label className="block mb-2">Email</label>
                    <input
                        type="email"
                        className="w-full p-2 border rounded"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block mb-2">Password</label>
                    <input
                        type="password"
                        className="w-full p-2 border rounded"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">Login</button>
                <div className="mt-4 flex justify-center">
                    <Link href="/registerPage" className="text-green-500">Register</Link>
                </div>
            </form>
        </div>
    );
};

export default LoginPage2;
