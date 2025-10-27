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
  mentee_name: string;
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

  const API_BASE_URL = import.meta.env.NEXT_PUBLIC_PROFILE_SYSTEM_API_BASE_URL || 'https://profile-system.vercel.app';

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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Recharge Requests</h1>
        {isLoading && <p className="text-blue-600">Loading recharge requests...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {!isLoading && rechargeRequests.length === 0 && <p className="text-gray-600">No pending recharge requests.</p>}
        {!isLoading && rechargeRequests.length > 0 && (
          <div className="overflow-x-auto mt-4 max-h-[60vh]">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Sr No.</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Mentee Name</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Balance Type</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Chat History</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rechargeRequests.map((request, index) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{index + 1}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{request.mentee_name}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{request.amount}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{request.type}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.status === 'approved' ? 'bg-green-100 text-green-800' : request.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{new Date(request.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">
                      <button
                        onClick={() => handleViewChat(request.chat_history)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        View Chat
                      </button>
                    </td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateStatus(request.id, 'approved', request.type, request.mentee_id, request.amount)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition duration-150 ease-in-out"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(request.id, 'rejected', request.type, request.mentee_id, request.amount)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition duration-150 ease-in-out"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showChatModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Chat History</h3>
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4">
                {currentChatHistory.map((message, index) => (
                  <div key={index} className="text-sm text-gray-700 text-left mb-2 last:mb-0">
                    <strong>{message.role}:</strong> {message.parts && message.parts.length > 0 && message.parts[0].text}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowChatModal(false)}
                  className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-custom-orange focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RechargeRequestPage;