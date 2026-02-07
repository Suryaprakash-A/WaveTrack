import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getUserInfo } from '../../utils/jwt';
import { FiGlobe, FiMapPin, FiCalendar, FiUser, FiInfo } from 'react-icons/fi';

const CustomerView = () => {
  const user = getUserInfo();

  const { data: subscriber, isLoading, isError } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      // 1. Check token key: 'jwt' ah illa 'token' ah nu check pannunga (LocalStorage-la enna name-la save aagudhu?)
      const token = localStorage.getItem('token') || localStorage.getItem('jwt');
      
      // 2. Corrected Backend URL path
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="p-10 text-center text-indigo-600 font-semibold italic animate-pulse">Loading your site details...</div>;
  
  if (isError || !subscriber) return (
    <div className="p-10 text-center">
      <div className="bg-red-50 p-4 rounded-lg inline-block text-red-500 border border-red-100">
        Subscription details not found. Please ensure you are logged in as a Subscriber.
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Subscription Details</h1>
        
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all hover:shadow-xl">
          <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center space-x-3">
              <FiGlobe className="h-6 w-6" />
              <span className="font-bold text-lg tracking-wide">{subscriber.siteName}</span>
            </div>
            <span className="bg-green-400 text-green-900 px-4 py-1 rounded-full text-xs font-black uppercase">
              {subscriber.status}
            </span>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-3 text-gray-600">
                <FiMapPin className="mt-1 text-indigo-500 text-xl" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Site Address</p>
                  <p className="text-sm font-medium leading-relaxed">{subscriber.siteAddress}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-600 border-t border-gray-50 pt-4">
                <FiUser className="text-indigo-500 text-xl" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Local Contact</p>
                  <p className="text-sm font-medium">{subscriber.localContact?.name} ({subscriber.localContact?.contact})</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-2xl space-y-4 border border-indigo-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-tight">ISP Provider:</span>
                <span className="text-indigo-700 font-extrabold text-lg">{subscriber.ispInfo?.name}</span>
              </div>
              
              <div className="flex justify-between items-center border-t border-indigo-200 pt-3">
                <div className="flex items-center text-gray-500 text-sm font-semibold">
                  <FiCalendar className="mr-2 text-indigo-500" /> RENEWAL DATE:
                </div>
                <span className="text-red-600 font-black text-lg">
                  {new Date(subscriber.ispInfo?.renewalDate).toLocaleDateString('en-GB')}
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-indigo-200 pt-3">
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-tight">Current Plan:</span>
                <span className="text-gray-800 font-bold">{subscriber.ispInfo?.broadbandPlan}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 px-8 flex items-center text-gray-500 text-xs font-medium">
            <FiInfo className="mr-2 text-indigo-400" />
            Support ID: <span className="ml-1 text-gray-700 font-bold underline cursor-pointer hover:text-indigo-600">{subscriber.subscriber_id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerView;
