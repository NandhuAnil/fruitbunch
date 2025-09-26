import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const OrderConfirmation = () => {
  const location = useLocation();
  const { orderId, payment } = location.state || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const orderRef = doc(db, "orders", orderId);
        const snapshot = await getDoc(orderRef);
        if (snapshot.exists()) {
          setOrder(snapshot.data());
        }
      } catch (err) {
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-red-500">
          Invalid order confirmation
        </h2>
        <Link to="/" className="text-green-600 underline">
          Go back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          🎉 Order Confirmed!
        </h1>
        <p className="text-gray-700 mb-6">
          Thank you for your purchase. Your payment was{" "}
          <span className="font-semibold">{payment?.toUpperCase()}</span> and
          your order has been successfully placed.
        </p>

        <div className="bg-gray-50 border rounded p-4 mb-6 text-left">
          <p className="mb-2">
            <span className="font-semibold">Order ID:</span> {orderId}
          </p>
          {loading ? (
            <p className="text-gray-500">Loading order details...</p>
          ) : order ? (
            <>
              <p className="mb-1">
                <span className="font-semibold">Amount:</span> ₹
                {order.amount}
              </p>
              <p className="mb-1">
                <span className="font-semibold">Status:</span> {order.status}
              </p>
              <p className="mb-1">
                <span className="font-semibold">Currency:</span>{" "}
                {order.currency}
              </p>
              <p className="mb-1">
                <span className="font-semibold">Date:</span>{" "}
                {order.createdAt?.toDate
                  ? order.createdAt.toDate().toLocaleString()
                  : "N/A"}
              </p>
            </>
          ) : (
            <p className="text-red-500">Order details not found.</p>
          )}
        </div>

        <div className="flex justify-center space-x-4">
          <Link
            to="/"
            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
          >
            Continue Shopping
          </Link>
          <Link
            to="/orders"
            className="bg-gray-600 text-white px-5 py-2 rounded hover:bg-gray-700"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;