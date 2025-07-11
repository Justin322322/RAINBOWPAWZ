'use client';

import React from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';

type SignupOptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectPersonalAccount: () => void;
  onSelectBusinessAccount: () => void;
  onShowLogin: () => void;
};

const SignupOptionModal: React.FC<SignupOptionModalProps> = ({
  isOpen,
  onClose,
  onSelectPersonalAccount,
  onSelectBusinessAccount,
  onShowLogin,
}) => {
  const options = [
    {
      title: "Fur Parent",
      description: "Create an account to memorialize your beloved pets",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: onSelectPersonalAccount,
    },
    {
      title: "Cremation Center",
      description: "Join our network of pet memorial service providers",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      onClick: onSelectBusinessAccount,
    },
  ];

  const handleLoginClick = () => {
    onClose();
    onShowLogin();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Account Type" size="small">
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-400 text-center font-light">
          Select the type of account that best suits your needs
        </p>

        <div className="grid gap-4">
          {options.map((option, index) => (
            <motion.button
              key={option.title}
              onClick={option.onClick}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="w-full p-6 bg-[var(--primary-green)] text-white rounded-xl hover:bg-[var(--primary-green-hover)] transition-all duration-200 group text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  {option.icon}
                </div>
                <div>
                  <h3 className="text-lg font-light tracking-wide text-white">
                    {option.title}
                  </h3>
                  <p className="mt-1 text-sm text-white font-light">
                    {option.description}
                  </p>
                </div>
                <div className="flex-shrink-0 self-center ml-auto">
                  <svg
                    className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-200"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-light">
          Already have an account?{' '}
          <button
            onClick={handleLoginClick}
            className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] font-medium transition-colors duration-200"
          >
            Log in
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SignupOptionModal;
