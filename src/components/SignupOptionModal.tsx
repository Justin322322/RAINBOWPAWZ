'use client';

import React from 'react';
import { Modal } from './ui/Modal';
import { motion } from 'framer-motion';
import { UserIcon, BuildingStorefrontIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

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
      description: "Create an account to memorialize your beloved pets.",
      icon: <UserIcon className="w-8 h-8 text-teal-700" />,
      onClick: onSelectPersonalAccount,
    },
    {
      title: "Cremation Center",
      description: "Join our network of pet memorial service providers.",
      icon: <BuildingStorefrontIcon className="w-8 h-8 text-teal-700" />,
      onClick: onSelectBusinessAccount,
    },
  ];

  const handleLoginClick = () => {
    onClose();
    onShowLogin();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="2xl"
    >
      <div className="p-6 pt-10">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          Choose Your Account Type
        </h2>
        <p className="text-gray-500 text-center mb-8 text-lg">
          Select the account that best suits your needs to get started.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {options.map((option, index) => (
            <motion.div
              key={option.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="w-full"
            >
              <button
                onClick={option.onClick}
                className="h-full w-full p-6 bg-white border-2 border-gray-200 text-gray-800 rounded-2xl hover:border-teal-500 hover:shadow-xl transition-all duration-300 group text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-5 mb-4">
                    <div className="flex-shrink-0 bg-teal-50 p-4 rounded-full">
                      {option.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-wide text-gray-900">
                        {option.title}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-2 text-md text-gray-600 font-normal">
                    {option.description}
                  </p>
                </div>
                <div className="flex items-center justify-end text-teal-600 mt-6">
                  <span className="text-md font-semibold mr-2">
                    Select
                  </span>
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="text-center text-md text-gray-500 mt-10">
          Already have an account?{' '}
          <button
            onClick={handleLoginClick}
            className="font-semibold text-teal-600 hover:text-teal-500 transition-colors duration-300"
          >
            Log in
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SignupOptionModal;
