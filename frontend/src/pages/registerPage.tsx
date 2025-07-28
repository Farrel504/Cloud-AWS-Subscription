import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link'; 

const RegisterPage: React.FC = () => {
    
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await axios.post(
                'https://091b0yq7ig.execute-api.us-east-1.amazonaws.com/test/registerFunction',
                JSON.stringify({ email, user_name: userName, password }),
                {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    validateStatus: (status) => status < 500,
                }
            );

            let responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            if (responseData?.body && typeof responseData.body === 'string') {
                try {
                    responseData = JSON.parse(responseData.body);
                } catch (err) {
                    console.error("Failed to parse response data:", err);
                    setError('Failed to parse server response');
                    return;
                }
            }

            if (response.status === 201 || responseData.success === true) {
                alert('Registration successful! Redirecting to login...');
                router.push('/');
            } else {
                setError(responseData.message || 'An error occurred during registration.');
            }
        } catch (error: any) {
            console.error('Error:', error.message);
            setError('An unexpected error occurred.');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <form onSubmit={handleRegister} className="bg-white p-8 rounded shadow-md w-80 text-black">
                <h2 className="text-2xl mb-4">Register</h2>
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
                    <label className="block mb-2">Username</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
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
                <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">Register</button>
                <div className="mt-4 text-center">
                    <Link href="/" className="text-blue-500">Already have an account? Login here.</Link>
                </div>
            </form>
        </div>
    );
};

export default RegisterPage;
