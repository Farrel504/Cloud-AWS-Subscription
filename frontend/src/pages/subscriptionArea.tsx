import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Subscription {
    uuid: string;
    title: string;
    artist: string;
    year: string;
    album: string;
    img_url?: string;
}

interface Props {
    userName: string;
    onLogout: () => void;
    subscriptionUpdated: boolean; 
}

const SubscriptionArea: React.FC<Props> = ({ userName, onLogout, subscriptionUpdated }) => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [error, setError] = useState('');

    const fetchSubscriptions = async () => {
        const storedSessionToken = localStorage.getItem('session_token');

        if (!storedSessionToken) {
            setError('Session token is missing. Please log in again.');
            return;
        }

        try {
            const response = await axios.get(
                `https://eqbqzqdxh1.execute-api.us-east-1.amazonaws.com/test/subscriptionFunction`, 
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Session-Token': storedSessionToken  
                    }
                }
            );


            if (response.status === 200) {
                let responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

                if (responseData.body && typeof responseData.body === 'string') {
                    responseData = JSON.parse(responseData.body);
                }

                if (responseData.subscriptions) {
                    setSubscriptions(responseData.subscriptions);
                } else {
                    setSubscriptions([]);
                    setError('No subscriptions found.');
                }
            } else {
                setError('Failed to fetch subscriptions.');
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            setError('Failed to fetch subscriptions.');
        }
    };

    useEffect(() => {
        fetchSubscriptions();
    }, [userName, subscriptionUpdated]);

    const handleRemoveSubscription = async (uuid: string) => {
        const storedSessionToken = localStorage.getItem('session_token');

        if (!storedSessionToken) {
            setError('Session token is missing. Please log in again.');
            return;
        }

        try {
            const response = await axios.delete('https://eqbqzqdxh1.execute-api.us-east-1.amazonaws.com/test/subscriptionFunction', {
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Session-Token': storedSessionToken  
                },
                data: { uuid }
            });

            if (response.status === 200) {
                console.log('Subscription removed successfully.');
                setSubscriptions(subscriptions.filter(sub => sub.uuid !== uuid));
            } else {
                setError('Failed to remove subscription.');
            }
        } catch (error) {
            console.error('Error removing subscription:', error);
            setError('Failed to remove subscription.');
        }
    };

    return (
        <div>
            <h3 className="text-xl mb-4">Subscription Area</h3>
            
            {subscriptions.length > 0 ? (
                <ul>
                    {subscriptions.map((sub) => (
                        <li key={sub.uuid} className="mb-4 flex items-center bg-gray-100 p-3 rounded-lg shadow-md">
                            {sub.img_url && (
                                <img src={sub.img_url} alt={sub.artist} className="w-20 h-20 rounded-lg mr-4" />
                            )}
                            <div className="flex-grow">
                                <p><strong>Title:</strong> {sub.title}</p>
                                <p><strong>Artist:</strong> {sub.artist}</p>
                                <p><strong>Year:</strong> {sub.year}</p>
                                <p><strong>Album:</strong> {sub.album}</p>
                            </div>
                            <button 
                                onClick={() => handleRemoveSubscription(sub.uuid)} 
                                className="bg-red-500 text-white px-3 py-1 rounded"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No subscriptions found.</p>
            )}

            {error && <div className="text-red-500 mb-4">{error}</div>}
        </div>
    );
};

export default SubscriptionArea;
