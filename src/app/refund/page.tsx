import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPage() {
    return (
        <div className="min-h-screen bg-[#0d0c0b] text-[#f7f7f5] font-sans selection:bg-amber-500 selection:text-white py-12 md:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <Link href="/" className="inline-flex items-center gap-2 text-[#8a867c] hover:text-amber-500 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>

                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Refund Policy</h1>
                <p className="text-[#8a867c] mb-12">Last Updated: February 23, 2026</p>

                <div className="space-y-8 text-[#d1ccc2] leading-relaxed text-lg">
                    <section>
                        <p className="mb-4">Payments are processed by Paddle.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Refund Eligibility</h2>
                        <p className="mb-4">Refunds may be requested within 7 days of purchase.</p>
                        <p>Refunds are not guaranteed and are evaluated case-by-case.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Non-Refundable Cases</h2>
                        <p className="mb-2">Refunds will generally not be issued if:</p>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li>significant use of the service has occurred</li>
                            <li>violation of Terms has occurred</li>
                            <li>refund is requested after 7 days</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">How to Request Refund</h2>
                        <p className="mb-4">
                            Contact: <a href="mailto:support@storygraph.org" className="text-amber-500 hover:text-amber-400 transition-colors">support@storygraph.org</a>
                        </p>
                        <p className="mb-2">Include:</p>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li>email used for purchase</li>
                            <li>reason for request</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Chargebacks</h2>
                        <p>Users are encouraged to contact support before initiating chargebacks.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
