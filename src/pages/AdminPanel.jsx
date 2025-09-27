import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Custom marker icon
  const markerIcon = new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceData();
    }
  }, [activeTab, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const ordersQuery = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc")
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setOrders(ordersData);

      // Fetch users and their subscriptions
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const subscriptionsWithOrders = usersData.map(user => {
        const userOrders = ordersData.filter(order => order.userId === user.id);
        const activeSubscription = userOrders.length > 0 ? {
          ...userOrders[0],
          daysLeft: calculateDaysLeft(userOrders[0].createdAt),
          status: calculateSubscriptionStatus(userOrders[0].createdAt)
        } : null;

        return {
          user,
          orders: userOrders,
          activeSubscription,
          totalOrders: userOrders.length,
          totalSpent: userOrders.reduce((sum, order) => sum + (order.amount || 0), 0)
        };
      });

      setSubscriptions(subscriptionsWithOrders);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const selectedOrders = orders.filter(order => {
        const orderDate = order.createdAt.toISOString().split('T')[0];
        return orderDate === selectedDate;
      });

      const attendance = {
        date: selectedDate,
        totalOrders: selectedOrders.length,
        delivered: selectedOrders.filter(order => order.deliveryStatus === 'delivered').length,
        notDelivered: selectedOrders.filter(order => 
          !order.deliveryStatus || order.deliveryStatus === 'pending' || order.deliveryStatus === 'not_delivered'
        ).length,
        orders: selectedOrders
      };

      setAttendanceData(attendance);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const calculateDaysLeft = (startDate) => {
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + 26);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  const calculateSubscriptionStatus = (startDate) => {
    const daysLeft = calculateDaysLeft(startDate);
    if (daysLeft === 0) return 'expired';
    if (daysLeft <= 7) return 'expiring_soon';
    return 'active';
  };

  const updateDeliveryStatus = async (orderId, status) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        deliveryStatus: status,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, deliveryStatus: status } : order
      ));
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, deliveryStatus: status }));
      }
      
      alert(`Delivery status updated to ${status}`);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      alert('Error updating delivery status');
    }
  };

  const handleCancelToday = async (userId) => {
    try {
      // Implement cancel today logic
      alert(`Cancelled delivery for user ${userId} for today`);
    } catch (error) {
      console.error('Error cancelling delivery:', error);
    }
  };

  const handleLeaveToday = async (userId) => {
    try {
      // Implement leave today logic
      alert(`Marked leave for user ${userId} for today`);
    } catch (error) {
      console.error('Error marking leave:', error);
    }
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      expiring_soon: { color: 'bg-yellow-100 text-yellow-800', label: 'Expiring Soon' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
      delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      not_delivered: { color: 'bg-red-100 text-red-800', label: 'Not Delivered' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600">Manage subscriptions, orders, and deliveries</p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['subscriptions', 'orders', 'attendance', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">User Subscriptions</h2>
              <p className="text-sm text-gray-600">Manage all user subscriptions and orders</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full"
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(subscription.user.name || subscription.user.email)}&background=random`}
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {subscription.user.name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500">{subscription.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {subscription.activeSubscription ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {subscription.activeSubscription.items?.[0]?.name || 'Subscription'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {subscription.activeSubscription.daysLeft} days left
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No active subscription</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {subscription.activeSubscription ? (
                          getStatusBadge(subscription.activeSubscription.status)
                        ) : (
                          getStatusBadge('expired')
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subscription.totalOrders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{subscription.totalSpent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => subscription.orders.length > 0 && openOrderModal(subscription.orders[0])}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View Orders
                        </button>
                        <button
                          onClick={() => handleCancelToday(subscription.user.id)}
                          className="text-red-600 hover:text-red-900 mr-3"
                        >
                          Cancel Today
                        </button>
                        <button
                          onClick={() => handleLeaveToday(subscription.user.id)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Leave Today
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Orders</h2>
              <p className="text-sm text-gray-600">Manage order deliveries and status</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subscriptions.find(sub => sub.user.id === order.userId)?.user.name || 'Unknown User'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.deliveryStatus || 'pending')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openOrderModal(order)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                        <select
                          value={order.deliveryStatus || 'pending'}
                          onChange={(e) => updateDeliveryStatus(order.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="delivered">Delivered</option>
                          <option value="not_delivered">Not Delivered</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Daily Attendance</h2>
                    <p className="text-sm text-gray-600">Track delivery attendance for specific dates</p>
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{attendanceData.totalOrders || 0}</div>
                    <div className="text-sm text-blue-800">Total Orders</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{attendanceData.delivered || 0}</div>
                    <div className="text-sm text-green-800">Delivered</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{attendanceData.notDelivered || 0}</div>
                    <div className="text-sm text-red-800">Not Delivered</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delivery Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData.orders?.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.id.slice(-8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {subscriptions.find(sub => sub.user.id === order.userId)?.user.name || 'Unknown User'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.deliveryStatus || 'pending')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <select
                              value={order.deliveryStatus || 'pending'}
                              onChange={(e) => updateDeliveryStatus(order.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="delivered">Delivered</option>
                              <option value="not_delivered">Not Delivered</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Users</h3>
              <div className="text-3xl font-bold text-blue-600">{subscriptions.length}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Orders</h3>
              <div className="text-3xl font-bold text-green-600">{orders.length}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Revenue</h3>
              <div className="text-3xl font-bold text-purple-600">
                ₹{orders.reduce((sum, order) => sum + (order.amount || 0), 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Order Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order ID:</label>
                      <p className="text-sm text-gray-900">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Amount:</label>
                      <p className="text-sm text-gray-900">₹{selectedOrder.amount}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status:</label>
                      <p className="text-sm">{getStatusBadge(selectedOrder.deliveryStatus || 'pending')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order Date:</label>
                      <p className="text-sm text-gray-900">{selectedOrder.createdAt.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <h4 className="font-semibold text-gray-900 mt-6 mb-4">Delivery Address</h4>
                  <div className="space-y-2 text-sm">
                    <p>{selectedOrder.shippingAddress?.address}</p>
                    <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}</p>
                    <p>{selectedOrder.shippingAddress?.pincode}, {selectedOrder.shippingAddress?.country}</p>
                  </div>
                </div>

                {/* Map */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Delivery Location</h4>
                  <div className="h-64 rounded-lg overflow-hidden">
                    <MapContainer
                      center={[12.2253, 79.0747]}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {selectedOrder.deliveryLocation && (
                        <Marker 
                          position={[selectedOrder.deliveryLocation.lat, selectedOrder.deliveryLocation.lng]} 
                          icon={markerIcon}
                        >
                          <Popup>
                            Delivery Location
                          </Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>

                  {/* Delivery Actions */}
                  <div className="mt-4 space-y-3">
                    <h4 className="font-semibold text-gray-900">Update Delivery Status</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateDeliveryStatus(selectedOrder.id, 'delivered')}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                      >
                        Mark as Delivered
                      </button>
                      <button
                        onClick={() => updateDeliveryStatus(selectedOrder.id, 'not_delivered')}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
                      >
                        Mark as Not Delivered
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">₹{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;