'use client';

import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';

import Image from 'next/image';
import { motion } from 'framer-motion';
import LoginModal from '@/components/LoginModal';
import SignupOptionModal from '@/components/SignupOptionModal';
import PersonalAccountModal from '@/components/PersonalAccountModal';
import BusinessAccountModal from '@/components/BusinessAccountModal';
import { SparklesIcon, CalendarIcon, HeartIcon, HomeIcon, CheckIcon, MapPinIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupOptionModalOpen, setIsSignupOptionModalOpen] = useState(false);
  const [isPersonalAccountModalOpen, setIsPersonalAccountModalOpen] = useState(false);
  const [isBusinessAccountModalOpen, setIsBusinessAccountModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Scroll effect for navbar, scroll spy, and check URL parameters
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Scroll spy functionality
      const sections = ['services', 'how-it-works', 'promise'];
      const navHeight = 80;
      const scrollPosition = window.scrollY + navHeight + 50; // Add offset for better detection

      let currentSection = '';

      // Check if we're in the hero section (at the top)
      const heroSection = document.getElementById('hero');
      if (heroSection && window.scrollY < heroSection.offsetHeight - 200) {
        currentSection = ''; // Clear active section when in hero
      } else {
        // Check other sections
        for (const sectionId of sections) {
          const element = document.getElementById(sectionId);
          if (element) {
            const elementTop = element.offsetTop;
            const elementBottom = elementTop + element.offsetHeight;

            if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
              currentSection = sectionId;
              break;
            }
          }
        }
      }

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Call once to set initial state

    // Check for showLogin parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showLogin') === 'true') {
      // Close all modals first
      setIsLoginModalOpen(false);
      setIsSignupOptionModalOpen(false);
      setIsPersonalAccountModalOpen(false);
      setIsBusinessAccountModalOpen(false);

      // Open login modal
      setIsLoginModalOpen(true);

      // Remove the parameter from URL without refreshing the page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeAllModals = () => {
    setIsLoginModalOpen(false);
    setIsSignupOptionModalOpen(false);
    setIsPersonalAccountModalOpen(false);
    setIsBusinessAccountModalOpen(false);
  };

  const openLoginModal = () => {
    closeAllModals();
    setIsLoginModalOpen(true);
  };

  const openSignupOptionModal = () => {
    closeAllModals();
    setIsSignupOptionModalOpen(true);
  };

  // Enhanced smooth scroll functionality with improved animation and visual feedback
  const handleSmoothScroll = (e: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (!element) return;

    // Add click animation to the link
    const target = e.currentTarget;
    target.style.transform = 'scale(0.95)';
    target.style.transition = 'transform 0.1s ease';
    setTimeout(() => {
      target.style.transform = '';
    }, 100);

    const navHeight = 80; // Height of your fixed navbar
    const additionalOffset = -10; // Negative offset to bring title closer to navbar
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navHeight - additionalOffset;

    // Add subtle visual feedback - very light highlight
    element.style.transition = 'background-color 0.2s ease';
    element.style.backgroundColor = 'rgba(27, 77, 62, 0.02)';

    // Custom smooth scroll with easing
    const startPosition = window.pageYOffset;
    const distance = offsetPosition - startPosition;
    const duration = Math.min(Math.abs(distance) / 2, 1000); // Dynamic duration based on distance, max 1s
    let startTime: number | null = null;

    // Easing function for smoother animation
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        // Remove highlight after scroll completes
        setTimeout(() => {
          element.style.backgroundColor = '';
          element.style.transition = '';
        }, 300);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Smooth scroll to top (hero section)
  const handleScrollToTop = (e: MouseEvent) => {
    e.preventDefault();

    // Add click animation to the logo
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.95)';
    target.style.transition = 'transform 0.1s ease';
    setTimeout(() => {
      target.style.transform = '';
    }, 100);

    // Custom smooth scroll to top
    const startPosition = window.pageYOffset;
    const duration = Math.min(startPosition / 2, 1000); // Dynamic duration, max 1s
    let startTime: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition * (1 - easedProgress));

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  const openPersonalAccountModal = () => {
    closeAllModals();
    setIsPersonalAccountModalOpen(true);
  };

  const openBusinessAccountModal = () => {
    closeAllModals();
    setIsBusinessAccountModalOpen(true);
  };



  // Style for navigation links and buttons
  const _navLinkStyle = "text-base font-medium text-gray-100 hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--primary-green)] after:transition-all after:duration-300 hover:after:w-full cursor-pointer";
  const buttonBaseStyle = "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out focus:outline-none border shadow-md hover:shadow-lg transform hover:-translate-y-0.5";
  const _primaryButtonStyle = `${buttonBaseStyle} bg-gradient-to-r from-[var(--primary-green)] to-[var(--primary-green-light)] hover:from-[var(--primary-green-hover)] hover:to-[var(--primary-green)] text-white border-transparent`;
  const _secondaryButtonStyle = `${buttonBaseStyle} bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border-white/30`;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-b from-stone-50 to-white text-gray-800">
      {/* Navigation */}
      <header className={`fixed w-full top-0 z-50 bg-[var(--primary-green)] transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <a onClick={handleScrollToTop} className="flex items-center space-x-2 sm:space-x-3 cursor-pointer touch-target">
              <Image src="/logo.png" alt="Rainbow Paws Logo" width={40} height={40} className="h-8 sm:h-10 w-auto" style={{ width: "auto" }} />
              <span className="text-lg sm:text-xl modern-heading text-white tracking-wide">RainbowPaws</span>
            </a>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-10">
              <a onClick={(e) => handleSmoothScroll(e, 'services')}
                className={`text-base modern-text text-white hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:bg-white after:transition-all after:duration-300 cursor-pointer ${
                  activeSection === 'services'
                    ? 'after:w-full text-white font-medium'
                    : 'after:w-0 hover:after:w-full'
                }`}
              >
                Memorial Services
              </a>
              <a onClick={(e) => handleSmoothScroll(e, 'how-it-works')}
                className={`text-base modern-text text-white hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:bg-white after:transition-all after:duration-300 cursor-pointer ${
                  activeSection === 'how-it-works'
                    ? 'after:w-full text-white font-medium'
                    : 'after:w-0 hover:after:w-full'
                }`}
              >
                How It Works
              </a>
              <a onClick={(e) => handleSmoothScroll(e, 'promise')}
                className={`text-base modern-text text-white hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:bg-white after:transition-all after:duration-300 cursor-pointer ${
                  activeSection === 'promise'
                    ? 'after:w-full text-white font-medium'
                    : 'after:w-0 hover:after:w-full'
                }`}
              >
                Our Promise
              </a>
            </nav>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-6">
              <button onClick={openLoginModal}
                className="text-white hover:text-white transition-all duration-300 modern-label tracking-wider relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
              >
                LOGIN
              </button>
              <button onClick={openSignupOptionModal}
                className="border border-white text-white px-6 py-2.5 rounded-full hover:bg-white hover:text-[var(--primary-green)] transition-all duration-300 modern-label tracking-wider"
              >
                JOIN US
              </button>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white p-3 rounded-lg hover:bg-white/20 transition-colors duration-300 touch-target"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile menu */}
            <div className="md:hidden bg-[var(--primary-green)] border-t border-white/20 relative z-50 shadow-lg">
              <div className="px-3 py-3 space-y-1">
                {/* Navigation Links */}
                <a
                  onClick={(e) => {
                    handleSmoothScroll(e, 'services');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 cursor-pointer touch-target ${
                    activeSection === 'services' ? 'bg-white/20 border-l-4 border-white' : ''
                  }`}
                >
                  <span className="modern-text text-base font-medium">Memorial Services</span>
                </a>

                <a
                  onClick={(e) => {
                    handleSmoothScroll(e, 'how-it-works');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 cursor-pointer touch-target ${
                    activeSection === 'how-it-works' ? 'bg-white/20 border-l-4 border-white' : ''
                  }`}
                >
                  <span className="modern-text text-base font-medium">How It Works</span>
                </a>

                <a
                  onClick={(e) => {
                    handleSmoothScroll(e, 'promise');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 cursor-pointer touch-target ${
                    activeSection === 'promise' ? 'bg-white/20 border-l-4 border-white' : ''
                  }`}
                >
                  <span className="modern-text text-base font-medium">Our Promise</span>
                </a>

                {/* Divider */}
                <div className="border-t border-white/20 my-4"></div>

                {/* Auth buttons for mobile */}
                <button
                  onClick={() => {
                    openLoginModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 touch-target"
                >
                  <span className="modern-text text-base font-medium">Login</span>
                </button>

                <button
                  onClick={() => {
                    openSignupOptionModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 touch-target border border-white/30 mt-2"
                >
                  <span className="modern-text text-base font-medium">Join Us</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover"
          >
            <source src="/dog.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
        </div>
        <div className="relative z-20 min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20">
          <div className="text-center max-w-4xl mx-auto text-white">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-5xl md:text-7xl modern-heading mb-6 sm:mb-8 tracking-wide text-white drop-shadow-2xl [text-shadow:_0_1px_2px_rgb(0_0_0_/_20%)]"
            >
              A Gentle Farewell
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl modern-text mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed text-white drop-shadow-xl [text-shadow:_0_1px_1px_rgb(0_0_0_/_10%)] px-2"
            >
              Providing dignified and compassionate memorial services for your beloved companions with grace and respect
            </motion.p>

            {/* Primary Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 mb-6 sm:mb-8 max-w-md sm:max-w-none mx-auto"
            >
              <button onClick={openPersonalAccountModal}
                className="mobile-hero-button mobile-hero-button-primary sm:w-auto sm:px-8 sm:text-lg"
              >
                BEGIN YOUR JOURNEY
              </button>
              <button onClick={openBusinessAccountModal}
                className="mobile-hero-button mobile-hero-button-secondary sm:w-auto sm:px-8 sm:text-lg"
              >
                JOIN OUR PROVIDER NETWORK
              </button>
            </motion.div>

            {/* Secondary Action Buttons - Mobile Only */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="md:hidden flex flex-col gap-3 max-w-xs mx-auto"
            >
              <button onClick={openLoginModal}
                className="w-full px-6 py-3 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/30 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 modern-label tracking-wide text-sm shadow-lg hover:shadow-xl min-h-[44px] touch-target"
              >
                LOGIN
              </button>
              <button onClick={openSignupOptionModal}
                className="w-full px-6 py-3 bg-transparent text-white hover:bg-white/10 border border-white rounded-full transition-all duration-300 transform hover:-translate-y-0.5 modern-label tracking-wide text-sm min-h-[44px] touch-target"
              >
                SIGN UP
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="scroll-mt-16 pt-16 pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Memorial Services</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: HeartIcon,
                title: "Private Memorial",
                description: "An intimate farewell ceremony in our serene memorial hall, personalized to honor your beloved companion's unique spirit.",
                features: [
                  "2-3 hours duration",
                  "Up to 30 guests",
                  "Personalized tribute"
                ]
              },
              {
                icon: SparklesIcon,
                title: "Memorial Ceremonies",
                description: "Beautiful ceremonies to celebrate your pet's life, including memorial services and tribute presentations.",
                features: ["Dignified Farewell"]
              },
              {
                icon: HomeIcon,
                title: "Home Services",
                description: "Compassionate at-home memorial services for a peaceful farewell in familiar surroundings.",
                features: ["In-Home Care"]
              }
            ].map((service, index) => (
              <div key={index} className="service-card">
                <service.icon className="service-icon" />
                <h3 className="service-title">{service.title}</h3>
                <p className="service-description">{service.description}</p>
                <div className="mt-auto">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="service-feature">
                      <CheckIcon className="h-5 w-5 text-[var(--primary-green)] mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="scroll-mt-16 pt-16 pb-24 bg-[var(--background-light)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl text-[var(--primary-green)] mb-16">How It Works</h2>
        </div>

        <div className="roadmap-container">
          <div className="roadmap-line"></div>
          {[
            {
              step: "1",
              title: "Choose a Service",
              description: "Browse our verified memorial service providers in your area and select the service that best honors your pet.",
              icon: <SparklesIcon className="step-icon" />
            },
            {
              step: "2",
              title: "Book the Service",
              description: "Schedule the memorial service at your preferred time and location with our easy booking system.",
              icon: <CalendarIcon className="step-icon" />
            },
            {
              step: "3",
              title: "Personalize",
              description: "Work with the provider to customize the memorial service according to your wishes and preferences.",
              icon: <HeartIcon className="step-icon" />
            },
            {
              step: "4",
              title: "Say Goodbye",
              description: "Experience a beautiful and dignified farewell ceremony for your beloved pet with full support.",
              icon: <SparklesIcon className="step-icon" />
            }
          ].map((item, index) => (
            <div key={index} className="step-wrapper">
              <div className="step-card">
                {item.icon}
                <div className="step-number">{item.step}</div>
                <h3 className="step-title">{item.title}</h3>
                <p className="step-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Promise Section - Add scroll margin to account for fixed header */}
      <section id="promise" className="scroll-mt-16 pt-16 pb-24 md:pb-32 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-800 mb-6">Our Promise to You</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[var(--primary-green)] to-[var(--primary-green-light)] mx-auto mb-16"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "With Honor",
                description: "We ensure every farewell reflects the depth of love shared between you and your cherished companion, honoring their unique spirit."
              },
              {
                title: "With Care",
                description: "Our gentle approach provides comfort in difficult moments, offering environmentally mindful services that respect both memory and nature."
              },
              {
                title: "With Love",
                description: "Each pet receives the same loving care we would give to our own, because we understand the profound bond you shared."
              }
            ].map((promise, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                key={index}
                className="p-8 bg-white rounded-2xl border border-gray-100 hover:border-teal-100 transition-all duration-300 shadow-sm hover:shadow-xl group"
              >
                <h3 className="text-2xl font-light text-gray-800 mb-4">{promise.title}</h3>
                <div className="w-16 h-1 bg-gradient-to-r from-[var(--primary-green)] to-[var(--primary-green-light)] mb-6 transition-all duration-300 group-hover:w-24"></div>
                <p className="text-gray-600 leading-relaxed">{promise.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why-choose" className="scroll-mt-20 py-24 md:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-800 mb-6">Why Choose Rainbow Paws</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[var(--primary-green)] to-[var(--primary-green-light)] mx-auto mb-16"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Verified Providers",
                description: "All our cremation centers are thoroughly vetted and licensed professionals.",
                icon: CheckIcon
              },
              {
                title: "Compassionate Care",
                description: "Treating every pet with dignity and every family with understanding.",
                icon: HeartIcon
              },
              {
                title: "Nationwide Service",
                description: "Connected with providers across the Philippines for accessible care.",
                icon: MapPinIcon
              }
            ].map((feature, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                key={index}
                className="p-8 bg-white rounded-2xl border border-gray-100 hover:border-teal-100 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col items-center group"
              >
                <div className="p-4 text-[var(--primary-green)] mb-6 transform transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-light text-gray-800 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-center">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modals */}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={closeAllModals} onShowSignup={openSignupOptionModal} />}
      {isSignupOptionModalOpen && <SignupOptionModal
        isOpen={isSignupOptionModalOpen}
        onClose={closeAllModals}
        onSelectPersonalAccount={() => { closeAllModals(); openPersonalAccountModal(); }}
        onSelectBusinessAccount={() => { closeAllModals(); openBusinessAccountModal(); }}
        onShowLogin={openLoginModal}
      />}
      {isPersonalAccountModalOpen && <PersonalAccountModal
        isOpen={isPersonalAccountModalOpen}
        onClose={closeAllModals}
        onBack={openSignupOptionModal}
      />}
      {isBusinessAccountModalOpen && <BusinessAccountModal
        isOpen={isBusinessAccountModalOpen}
        onClose={closeAllModals}
        onBack={openSignupOptionModal}
      />}
    </div>
  );
}
