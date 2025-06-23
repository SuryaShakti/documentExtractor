"use client";

import Image from 'next/image';
import Link from 'next/link';
import { FileText, Zap, Shield, Users } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Document Extractor</span>
            </Link>
          </div>
          
          {children}
        </div>
      </div>

      {/* Right Side - Marketing/Features */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 relative">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        
        <div className="relative h-full flex flex-col justify-center px-12 text-white">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-6">
              Extract Data from Documents with AI
            </h1>
            <p className="text-xl text-blue-100 mb-12">
              Transform your document processing workflow with intelligent data extraction powered by advanced AI models.
            </p>

            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Lightning Fast Processing</h3>
                  <p className="text-blue-100">
                    Upload documents and get structured data extracted in seconds using state-of-the-art AI models.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
                  <p className="text-blue-100">
                    Your documents are processed securely with enterprise-grade encryption and privacy protection.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Team Collaboration</h3>
                  <p className="text-blue-100">
                    Share projects with your team and collaborate on document processing workflows.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 bg-gray-300 rounded-full"></div>
                <div>
                  <div className="font-medium">Sarah Chen</div>
                  <div className="text-sm text-blue-100">Data Analyst at TechCorp</div>
                </div>
              </div>
              <p className="text-blue-100 italic">
                "Document Extractor has transformed how we process invoices and contracts. What used to take hours now takes minutes."
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full -ml-12 -mb-12"></div>
      </div>
    </div>
  );
}
