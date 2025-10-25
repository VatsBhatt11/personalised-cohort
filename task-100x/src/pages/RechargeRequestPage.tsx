import useAuth from '@/hooks/useAuth';
import React, { useEffect, useState } from 'react';

interface ChatMessage {
  id: string;
  role: string;
  parts: { type: string; text: string }[];
}

interface RechargeRequest {
  id: string;
  mentee_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  chat_history: ChatMessage[];
  type: string; // Add the new balance type field
}

const RechargeRequestPage = () => {
  const { user, loading } = useAuth(); // Assuming useAuth provides user and loading state
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [currentChatHistory, setCurrentChatHistory] = useState<ChatMessage[]>([]);

  const API_BASE_URL = import.meta.env.NEXT_PUBLIC_PROFILE_SYSTEM_API_BASE_URL || 'http://localhost:3000';

  const fetchRechargeRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/recharge-requests`, {
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if your API requires it
          // 'Authorization': `Bearer ${user?.token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: RechargeRequest[] = await response.json();
      setRechargeRequests(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch recharge requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      fetchRechargeRequests();
    }
  }, [user, loading]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected', balanceType: string, menteeId: string, amount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recharge-requests`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ id, status, menteeId, amount, balanceType }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      fetchRechargeRequests();
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to update recharge request status:', err);
    }
  };

  const handleViewChat = (chatHistory: ChatMessage[]) => {
    setCurrentChatHistory(chatHistory);
    setShowChatModal(true);
  };

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  if (!user) {
    return <div>Please log in to view recharge requests.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Recharge Requests</h1>
      {isLoading && <p>Loading recharge requests...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!isLoading && rechargeRequests.length === 0 && <p>No pending recharge requests.</p>}
      {!isLoading && rechargeRequests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">ID</th>
                <th className="py-2 px-4 border-b">Mentee ID</th>
                <th className="py-2 px-4 border-b">Amount</th>
                <th className="py-2 px-4 border-b">Balance Type</th> {/* New column header */}
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Created At</th>
                <th className="py-2 px-4 border-b">Chat History</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rechargeRequests.map((request) => (
                <tr key={request.id}>
                  <td className="py-2 px-4 border-b">{request.id}</td>
                  <td className="py-2 px-4 border-b">{request.mentee_id}</td>
                  <td className="py-2 px-4 border-b">{request.amount}</td>
                  <td className="py-2 px-4 border-b">{request.type}</td> {/* Display balance type */}
                  <td className="py-2 px-4 border-b">{request.status}</td>
                  <td className="py-2 px-4 border-b">{new Date(request.created_at).toLocaleString()}</td>
                  <td className="py-2 px-4 border-b">
                    <button
                      onClick={() => handleViewChat(request.chat_history)}
                      className="text-blue-500 hover:underline"
                    >
                      View Chat
                    </button>
                  </td>
                  <td className="py-2 px-4 border-b">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(request.id, 'approved', request.type, request.mentee_id, request.amount)}
                          className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(request.id, 'rejected', request.type, request.mentee_id, request.amount)}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showChatModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Chat History</h3>
              <div className="mt-2 px-7 py-3">
                {currentChatHistory.map((message, index) => (
                  <div key={index} className="text-sm text-gray-500 text-left mb-2">
                    <strong>{message.role}:</strong> {message.parts && message.parts.length > 0 && message.parts[0].text}
                  </div>
                ))}
              </div>
              <div className="items-center px-4 py-3">
                <button
                  id="ok-btn"
                  onClick={() => setShowChatModal(false)}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RechargeRequestPage;