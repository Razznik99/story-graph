import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#0d0c0b] text-[#f7f7f5] font-sans selection:bg-amber-500 selection:text-white py-12 md:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <Link href="/" className="inline-flex items-center gap-2 text-[#8a867c] hover:text-amber-500 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>

                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Privacy Policy</h1>
                <p className="text-[#8a867c] mb-12">Last Updated: February 23, 2026</p>

                <div className="space-y-8 text-[#d1ccc2] leading-relaxed text-lg">
                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-6">Information We Collect</h2>

                        <h3 className="text-xl font-medium text-white mb-2">Account Information:</h3>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>email address</li>
                            <li>authentication data</li>
                        </ul>

                        <h3 className="text-xl font-medium text-white mb-2">Content Data:</h3>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>story content you create</li>
                        </ul>

                        <h3 className="text-xl font-medium text-white mb-2">Usage Data:</h3>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>interactions with the service</li>
                        </ul>

                        <h3 className="text-xl font-medium text-white mb-2">Payment Data:</h3>
                        <p>Payments are processed by Paddle. We do not store full payment details.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">How We Use Information</h2>
                        <p className="mb-2">We use data to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>provide the service</li>
                            <li>maintain system security</li>
                            <li>improve functionality</li>
                            <li>process payments via Paddle</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Data Storage</h2>
                        <p className="mb-4">Data is stored securely using industry-standard protections.</p>
                        <p>We take reasonable measures to protect data.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Image Uploads and Public Access</h2>
                        <p className="mb-4">Story Graph allows users to upload or generate images associated with story content and cards.</p>
                        <p className="mb-4">These images may be stored using third-party infrastructure and may be accessible via publicly accessible URLs.</p>
                        <p className="mb-4">Anyone with the direct URL may be able to view the image.</p>
                        <p className="mb-4">Users should avoid uploading confidential, sensitive, or proprietary images they do not wish to be publicly accessible.</p>
                        <p>Story Graph does not guarantee private access to uploaded images unless explicitly stated otherwise.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Data Sharing</h2>
                        <p className="mb-4">We do not sell your personal data.</p>
                        <p className="mb-2">We share data only with essential providers such as:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Paddle (payment processing)</li>
                            <li>hosting providers</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Data Retention</h2>
                        <p className="mb-4">We retain data while your account is active.</p>
                        <p>You may request deletion at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">Your Rights</h2>
                        <p className="mb-2">You may request:</p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>access to your data</li>
                            <li>correction of your data</li>
                            <li>deletion of your data</li>
                        </ul>
                        <p>Contact: <a href="mailto:support@storygraph.org" className="text-amber-500 hover:text-amber-400 transition-colors">support@storygraph.org</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
}
