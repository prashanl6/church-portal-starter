'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminBookingsPage() {
  const { data, mutate } = useSWR('/api/admin/bookings', fetcher);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Admin — Bookings</h1>
      <div className="grid gap-3">
        {data?.list && data.list.length === 0 ? (
          <p className="text-gray-600">No bookings found.</p>
        ) : (
          (data?.list || []).map((booking: any) => (
            <div key={booking.id} className="card">
              <div className="grid gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">
                      {booking.bookingRef} - {booking.requesterName}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {booking.email} · {booking.phone}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    booking.status === 'BOOKED_PAID' ? 'bg-green-100 text-green-800' :
                    booking.status === 'APPROVED_PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-800' :
                    booking.status === 'REQUESTED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Hall:</strong> {booking.hall}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(booking.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div>
                    <strong>Time:</strong> {booking.startTime} - {booking.endTime}
                  </div>
                  <div>
                    <strong>Purpose:</strong> {booking.purpose}
                  </div>
                </div>
                {booking.paymentRef && (
                  <div className="text-sm">
                    <strong>Payment Ref:</strong> {booking.paymentRef}
                  </div>
                )}
                {booking.amount && (
                  <div className="text-sm">
                    <strong>Amount:</strong> ${booking.amount.toFixed(2)}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Created: {new Date(booking.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

