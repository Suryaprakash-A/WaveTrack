import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSubscriberByIdAPI } from "../../../services/subscriberServices";
import { useQuery } from "@tanstack/react-query";
import SubscriberCard from "../../../components/SubscriberCard";
import PaymentEntriesTable from "../../../components/PaymentEntriesTable";
import { paymentsData } from "../../../constants";
import {
  getPaymentsAPI,
  getPaymentsBySubscriberIdAPI,
} from "../../../services/paymentServices";
import { Loader } from "lucide-react";

const Subscriber = () => {
  const { id } = useParams();
  const {
    data: subscriber,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: () => getSubscriberByIdAPI(id),
    queryKey: ["getSubscriberById", id],
    refetchOnWindowFocus: true,
    enabled: !!id,
  });

  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: paymentsRefetch,
  } = useQuery({
    queryFn: () => getPaymentsBySubscriberIdAPI(id),
    queryKey: ["getPaymentsBySubscriberIdAPI", id],
    refetchOnWindowFocus: true,
    enabled: !!id,
  });

  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // Create a refetch function that we can call when the page is navigated to
  const forceRefetch = useCallback(async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
      await paymentsRefetch();
    } finally {
      setIsManualRefetching(false);
    }
  }, [refetch, paymentsRefetch]);

  // Detect when the page is navigated to and refetch
  useEffect(() => {
    // This will run whenever the location (route) changes
    forceRefetch();
  }, [location.pathname, forceRefetch]);

  if (isManualRefetching) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 md:gap-4 p-4 h-[90vh] bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Left Column - Subscriber Card */}
      <div className="col-span-1 md:overflow-y-auto hide-scrollbar rounded-2xl">
        <SubscriberCard subscriber={subscriber?.data} refetch={refetch} />
      </div>

      {/* Right Column - Payments Table */}
      <div className="col-span-2 md:overflow-y-auto hide-scrollbar rounded-2xl">
        <PaymentEntriesTable
          payments={payments?.data}
          refetch={paymentsRefetch}
          subscriber={subscriber?.data}
          subRefetch={refetch}
        />
      </div>
    </div>
  );
};

export default Subscriber;
