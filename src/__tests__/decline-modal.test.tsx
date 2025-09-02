import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeclineModal from '@/components/DeclineModal';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: ({ className }: any) => <svg className={className} data-testid="x-icon" />,
  CheckIcon: ({ className }: any) => <svg className={className} data-testid="check-icon" />,
  XCircleIcon: ({ className }: any) => <svg className={className} data-testid="x-circle-icon" />,
  DocumentIcon: ({ className }: any) => <svg className={className} data-testid="document-icon" />,
  ArrowPathIcon: ({ className }: any) => <svg className={className} data-testid="arrow-path-icon" />,
}));

describe('DeclineModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onDecline: vi.fn(),
    title: 'Decline Application',
    minLength: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open', () => {
    render(<DeclineModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Decline Application' })).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline Application' })).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<DeclineModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Decline Application')).not.toBeInTheDocument();
  });

  it('should show document selection when requesting documents', async () => {
    const user = userEvent.setup();
    render(<DeclineModal {...defaultProps} />);

    // Check the "Request specific documents" checkbox
    const checkbox = screen.getByLabelText(/Request specific documents/i);
    await user.click(checkbox);

    // Should show document selection section
    expect(screen.getByText('Select Required Documents')).toBeInTheDocument();
    expect(screen.getByText('Business Permit')).toBeInTheDocument();
    expect(screen.getByText('BIR Certificate')).toBeInTheDocument();
    expect(screen.getByText('Government ID')).toBeInTheDocument();
  });

  it('should validate minimum reason length', async () => {
    const user = userEvent.setup();
    const mockOnDecline = vi.fn();

    render(<DeclineModal {...defaultProps} onDecline={mockOnDecline} />);

    // Type short reason
    const textarea = screen.getByPlaceholderText(/Enter your reason here/i);
    await user.type(textarea, 'Short');

    // Click decline button
    const declineButton = screen.getByRole('button', { name: 'Decline Application' });
    await user.click(declineButton);

    // Should show error message
    expect(screen.getByText(/Please provide a more detailed reason/)).toBeInTheDocument();
    expect(mockOnDecline).not.toHaveBeenCalled();
  });

  it('should require document selection when requesting documents', async () => {
    const user = userEvent.setup();
    const mockOnDecline = vi.fn();

    render(<DeclineModal {...defaultProps} onDecline={mockOnDecline} />);

    // Check request documents
    const checkbox = screen.getByLabelText(/Request specific documents/i);
    await user.click(checkbox);

    // Type valid reason
    const textarea = screen.getByPlaceholderText(/Enter your reason here/i);
    await user.type(textarea, 'This is a valid reason that meets the minimum length requirement for testing purposes.');

    // Click decline button without selecting documents
    const declineButton = screen.getByText('Request Documents');
    await user.click(declineButton);

    // Should show validation error
    expect(screen.getAllByText('Please select at least one document type to request.')[0]).toBeInTheDocument();
    expect(mockOnDecline).not.toHaveBeenCalled();
  });

  it('should call onDecline with correct parameters', async () => {
    const user = userEvent.setup();
    const mockOnDecline = vi.fn();

    render(<DeclineModal {...defaultProps} onDecline={mockOnDecline} />);

    // Enable document request
    const checkbox = screen.getByLabelText(/Request specific documents/i);
    await user.click(checkbox);

    // Select some documents
    const businessPermitCheckbox = screen.getByRole('checkbox', { name: /business permit/i });
    const governmentIdCheckbox = screen.getByRole('checkbox', { name: /government id/i });
    await user.click(businessPermitCheckbox);
    await user.click(governmentIdCheckbox);

    // Type valid reason
    const textarea = screen.getByPlaceholderText(/Enter your reason here/i);
    await user.type(textarea, 'This is a valid reason that meets the minimum length requirement for testing purposes.');

    // Click request documents button
    const requestButton = screen.getByText('Request Documents');
    await user.click(requestButton);

    // Should call onDecline with correct parameters
    expect(mockOnDecline).toHaveBeenCalledWith(
      'This is a valid reason that meets the minimum length requirement for testing purposes.',
      true,
      ['business_permit', 'government_id']
    );
  });

  it('should show success state after successful submission', async () => {
    const user = userEvent.setup();
    const mockOnDecline = vi.fn().mockResolvedValue(undefined);

    render(<DeclineModal {...defaultProps} onDecline={mockOnDecline} />);

    // Type valid reason
    const textarea = screen.getByPlaceholderText(/Enter your reason here/i);
    await user.type(textarea, 'Valid reason for testing.');

    // Click decline button
    const declineButton = screen.getByRole('button', { name: 'Decline Application' });
    await user.click(declineButton);

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Application declined successfully!')).toBeInTheDocument();
    });
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<DeclineModal {...defaultProps} onClose={mockOnClose} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<DeclineModal {...defaultProps} onClose={mockOnClose} />);

    const closeButton = screen.getByTestId('x-icon');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display document descriptions', async () => {
    const user = userEvent.setup();
    render(<DeclineModal {...defaultProps} />);

    // Enable document request
    const checkbox = screen.getByLabelText(/Request specific documents/i);
    await user.click(checkbox);

    // Check descriptions are displayed
    expect(screen.getByText('Official business registration document')).toBeInTheDocument();
    expect(screen.getByText('Bureau of Internal Revenue certificate')).toBeInTheDocument();
    expect(screen.getByText('Valid government-issued ID of owner')).toBeInTheDocument();
  });
});
