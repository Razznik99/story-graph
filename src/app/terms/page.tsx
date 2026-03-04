import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0d0c0b] text-[#f7f7f5] font-sans selection:bg-amber-500 selection:text-white py-12 md:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <Link href="/" className="inline-flex items-center gap-2 text-[#8a867c] hover:text-amber-500 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>

                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Terms of Service</h1>
                <p className="text-[#8a867c] mb-12">Last Updated: February 23, 2026</p>

                <div className="space-y-8 text-[#d1ccc2] leading-relaxed text-lg">
                    <section>
                        <p className="mb-4">Welcome to Story Graph.</p>
                        <p className="mb-4">These Terms of Service govern your use of the Story Graph website and services.</p>
                        <p className="mb-4">By accessing or using Story Graph, you agree to these Terms.</p>
                        <p>If you do not agree, do not use the service.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">1. Description of Service</h2>
                        <p className="mb-4">Story Graph provides a web-based platform for planning, organizing, and structuring narrative content using graph-based tools.</p>
                        <p>We may modify, update, or discontinue features at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">2. User Accounts</h2>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li>You are responsible for maintaining the security of your account.</li>
                            <li>You are responsible for all activity under your account.</li>
                            <li>You must provide accurate information.</li>
                        </ul>
                        <p>We may suspend or terminate accounts that violate these Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">3. User Content</h2>
                        <p className="mb-4">You retain full ownership of all content you create.</p>
                        <p className="mb-4">You grant Story Graph a limited license to store, process, and display your content solely to provide the service.</p>
                        <p>We do not claim ownership of your stories.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">4. Acceptable Use</h2>
                        <p className="mb-4">You may not use Story Graph to:</p>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li>violate any laws</li>
                            <li>upload malicious code</li>
                            <li>attempt to reverse engineer the service</li>
                            <li>interfere with system integrity</li>
                            <li>abuse the platform</li>
                        </ul>
                        <p>We may suspend accounts that violate these rules.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">5. Content Visibility</h2>
                        <p className="mb-4">Users acknowledge that certain content, including uploaded images, may be stored using publicly accessible URLs.</p>
                        <p>Users are responsible for ensuring they do not upload confidential or sensitive content they do not wish to be publicly accessible.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">6. Payments</h2>
                        <p className="mb-4">Payments are processed by Paddle, our Merchant of Record.</p>
                        <p className="mb-4">Paddle manages billing, taxes, and payment processing.</p>
                        <p>By purchasing, you agree to Paddle's terms and policies.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">7. Termination</h2>
                        <p className="mb-4">We may suspend or terminate access at any time for violations.</p>
                        <p>You may stop using the service at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">8. Disclaimer of Warranties</h2>
                        <p className="mb-4">The service is provided &quot;as is&quot; without warranties of any kind.</p>
                        <p>We do not guarantee uninterrupted or error-free operation.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">9. Limitation of Liability</h2>
                        <p>To the maximum extent permitted by law, Story Graph shall not be liable for any indirect, incidental, or consequential damages.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-white mb-4 mt-12">10. Changes to Terms</h2>
                        <p className="mb-4">We may update these Terms at any time.</p>
                        <p>Continued use means acceptance of updated Terms.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
