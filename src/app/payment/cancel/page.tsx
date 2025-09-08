'use client';

import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircleIcon } from '@heroicons/react/24/solid';

interface BookingSummary {
	id: number;
	status?: string | null;
	total_amount?: number | null;
	total_price?: number | null;
	price?: number | null;
	booking_date?: string | null;
	booking_time?: string | null;
	pet_name?: string | null;
	pet_type?: string | null;
	provider_address?: string | null;
	service_name?: string | null;
}

interface RefundSummary {
	id: number;
	amount: number;
	status: string;
	refund_type: string;
	reason?: string | null;
	initiated_at?: string | null;
}

function PaymentCancelContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [booking, setBooking] = useState<BookingSummary | null>(null);
	const [refund, setRefund] = useState<RefundSummary | null>(null);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const bookingId = searchParams.get('booking_id');
	const parsedBookingId = useMemo(() => {
		const id = Number(bookingId);
		return Number.isFinite(id) ? id : null;
	}, [bookingId]);

	useEffect(() => {
		const timer = setTimeout(() => setIsLoading(false), 300);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!parsedBookingId) return;

		let stopped = false;

		const fetchData = async () => {
			try {
				const bookingsRes = await fetch('/api/bookings', { cache: 'no-store', credentials: 'include' as RequestCredentials });
				if (bookingsRes.ok) {
					const bookingsJson: { bookings?: BookingSummary[] } = await bookingsRes.json();
					const found = bookingsJson.bookings?.find(b => Number(b.id) === parsedBookingId) || null;
					if (!stopped) setBooking(found);
				}

				const refundsRes = await fetch(`/api/refunds?booking_id=${parsedBookingId}`, { cache: 'no-store', credentials: 'include' as RequestCredentials });
				if (refundsRes.ok) {
					const refundsJson: { refunds?: RefundSummary[] } = await refundsRes.json();
					const latest = refundsJson.refunds && refundsJson.refunds.length > 0 ? refundsJson.refunds[0] : null;
					if (!stopped) setRefund(latest);
				}
			} catch {
				// ignore
			}
		};

		// initial
		void fetchData();
		// poll
		intervalRef.current = setInterval(() => {
			void fetchData();
		}, 2000);

		return () => {
			stopped = true;
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [parsedBookingId]);

	const amountDisplay = useMemo(() => {
		const amount = refund?.amount ?? booking?.total_amount ?? booking?.total_price ?? booking?.price;
		return typeof amount === 'number' ? amount : null;
	}, [booking, refund]);

	const handleRetryPayment = () => {
		// Redirect back to checkout with the same booking
		router.push(`/user/furparent_dashboard/bookings/checkout?booking_id=${bookingId}&retry=true`);
	};

	const handleGoToBookings = () => {
		router.push('/user/furparent_dashboard/bookings');
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin mx-auto h-12 w-12 border-4 border-orange-600 border-t-transparent rounded-full mb-4"></div>
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Cancellation</h2>
					<p className="text-gray-600">Please wait...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
				<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-6">
					<XCircleIcon className="h-10 w-10 text-orange-600" />
				</div>

				<h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
				<p className="text-gray-600 mb-6">Your transaction was cancelled. Live details update below.</p>

				{bookingId && (
					<div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
						<h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600">Reference:</span>
								<span className="font-medium">#{bookingId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Status:</span>
								<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
									(booking?.status || '').toLowerCase() === 'cancelled'
										? 'bg-red-100 text-red-800'
										: 'bg-orange-100 text-orange-800'
								}` }>
									{(booking?.status || 'pending').toLowerCase()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Service:</span>
								<span className="font-medium">{booking?.service_name || 'Cremation Service'}</span>
							</div>
							{amountDisplay !== null && (
								<div className="flex justify-between">
									<span className="text-gray-600">Amount:</span>
									<span className="font-semibold">₱{Number(amountDisplay).toFixed(2)}</span>
								</div>
							)}
							{(booking?.booking_date || booking?.booking_time) && (
								<div className="flex justify-between">
									<span className="text-gray-600">Schedule:</span>
									<span className="font-medium">{booking?.booking_date} • {booking?.booking_time?.substring(0, 5)}</span>
								</div>
							)}
							{booking?.pet_name && booking?.pet_type && (
								<div>
									<div className="text-gray-600">Pet Information</div>
									<div className="font-medium">{booking.pet_name} ({booking.pet_type})</div>
								</div>
							)}
							{booking?.provider_address && (
								<div>
									<div className="text-gray-600">Service Location</div>
									<div className="font-medium">{booking.provider_address}</div>
								</div>
							)}
						</div>
					</div>
				)}

				{(refund || booking) && (
					<div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
						<h3 className="font-semibold text-gray-900 mb-3">Refund Information</h3>
						{refund ? (
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-600">Amount:</span>
									<span className="font-semibold">₱{Number(refund.amount).toFixed(2)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Status:</span>
									<span className="font-medium capitalize">{refund.status}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Type:</span>
									<span className="font-medium">{refund.refund_type}</span>
								</div>
								{refund.reason && (
									<div className="flex justify-between">
										<span className="text-gray-600">Reason:</span>
										<span className="font-medium">{refund.reason}</span>
									</div>
								)}
								{refund.initiated_at && (
									<div className="flex justify-between">
										<span className="text-gray-600">Initiated:</span>
										<span className="font-medium">{new Date(refund.initiated_at).toLocaleDateString()}</span>
									</div>
								)}
							</div>
						) : (
							<div className="text-sm text-gray-600">No refund record yet. Waiting for cancellation processing...</div>
						)}
					</div>
				)}

				<div className="space-y-3">
					{bookingId && (
						<button
							onClick={handleRetryPayment}
							className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
						>
							Try Payment Again
						</button>
					)}

					<button
						onClick={handleGoToBookings}
						className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
					>
						Go to My Bookings
					</button>

					<button
						onClick={() => router.push('/user/furparent_dashboard')}
						className="w-full text-gray-500 py-2 px-4 rounded-lg hover:text-gray-700 transition-colors"
					>
						Back to Dashboard
					</button>
				</div>

				<div className="mt-6 pt-6 border-t border-gray-200">
					<p className="text-xs text-gray-500">
						If you need assistance, please contact our support team. Your booking reference is #{bookingId}.
					</p>
				</div>
			</div>
		</div>
	);
}

export default function PaymentCancelPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin mx-auto h-12 w-12 border-4 border-orange-600 border-t-transparent rounded-full mb-4"></div>
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
					<p className="text-gray-600">Please wait...</p>
				</div>
			</div>
		}>
			<PaymentCancelContent />
		</Suspense>
	);
}
