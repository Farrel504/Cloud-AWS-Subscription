import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import SubscriptionArea from './subscriptionArea';
import QueryArea from './queryArea';

const MainPage: React.FC = () => {
    const [userName, setUserName] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [subscriptionUpdated, setSubscriptionUpdated] = useState(false); 
    const router = useRouter();

    const handleSubscriptionUpdate = () => {
        setSubscriptionUpdated(!subscriptionUpdated); 
    };

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

    useEffect(() => {
        checkSessionExpiration();
        const interval = setInterval(checkSessionExpiration, 60000); 

        return () => clearInterval(interval);
    }, [router]);

    useEffect(() => {
        const storedSessionToken = localStorage.getItem('session_token');
        console.log('Stored Session Token:', storedSessionToken);
    
        if (!storedSessionToken) {
            console.log('No session token found, redirecting to login page.');
            router.push('/');
            return;
        }
    
        const fetchUserData = async () => {
            try {
                console.log('Making request to mainPage Lambda with token:', storedSessionToken);
                
                const response = await axios.get(
                    'https://wyrbii4vx4.execute-api.us-east-1.amazonaws.com/test/mainPage', 
                    { 
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Session-Token': storedSessionToken  
                        }
                    }
                );
        
                console.log('Response received from mainPage Lambda:', response);
        
                let responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        
                if (responseData.body && typeof responseData.body === 'string') {
                    responseData = JSON.parse(responseData.body);
                }
        
                console.log('Parsed Response Data:', responseData);
        
                if (responseData.success) {
                    console.log('User successfully authenticated:', responseData.user_name);
                    setUserName(responseData.user_name);
                } else {
                    console.error('Authentication failed, redirecting to login:', responseData.message);
                    setError(responseData.message || 'Failed to authenticate user.');
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('session_expiration');
                    router.push('/');
                }
            } catch (error) {
                console.error('Error fetching user data:', (error as any).message || error);
                setError('Failed to fetch user data.');
                localStorage.removeItem('session_token');
                localStorage.removeItem('session_expiration');
                router.push('/');
            }
        };
        
        fetchUserData();
    }, [router, subscriptionUpdated]);
    
    const handleLogout = () => {
        console.log('Logout function called.');
        localStorage.removeItem('session_token');
        localStorage.removeItem('session_expiration');
        router.push('/');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black">
            <div className="bg-white p-8 rounded shadow-md w-[1200px] text-black mb-6"> 
                <h2 className="text-3xl mb-6 text-center">Main Page</h2>
                
                {userName ? (
                    <>
                        <div className="mb-6 text-center">
                            <h3 className="text-2xl mb-2">User Area</h3>
                            <p>Welcome, {userName}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8"> 
                            <div className="col-span-1">
                                <SubscriptionArea 
                                    userName={userName} 
                                    onLogout={handleLogout} 
                                    subscriptionUpdated={subscriptionUpdated} 
                                />
                            </div>
                            <div className="col-span-1">
                                <QueryArea 
                                    userName={userName} 
                                    onSubscriptionUpdate={handleSubscriptionUpdate} 
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <p>Loading user data...</p>
                )}

                {error && <div className="text-red-500 mb-4 text-center">{error}</div>}

                <div className="mt-6 text-center">
                    <button 
                        onClick={handleLogout} 
                        className="w-full p-3 bg-red-500 text-white rounded text-lg"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MainPage;
