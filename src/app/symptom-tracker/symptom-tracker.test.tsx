
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SymptomTrackerPage from './page';

// Mocks
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/firebase', () => ({
  useFirebase: () => ({
    firestore: {},
  }),
  useUser: () => ({
    user: { uid: 'test-user' },
    isUserLoading: false,
  }),
  useCollection: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  addDocumentNonBlocking: jest.fn(() => Promise.resolve({ id: 'new-doc' })),
  deleteCollectionNonBlocking: jest.fn(() => Promise.resolve()),
  useMemoFirebase: (fn) => fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('SymptomTrackerPage', () => {
  it('renders the page title and description', () => {
    render(<SymptomTrackerPage />);
    expect(screen.getByText('Symptom Tracker')).toBeInTheDocument();
    expect(
      screen.getByText('Log your symptoms daily to visualize patterns and create reports.')
    ).toBeInTheDocument();
  });

  it('renders the symptom logging form', () => {
    render(<SymptomTrackerPage />);
    expect(screen.getByLabelText('Symptom Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity (1-10)')).toBeInTheDocument();
    expect(screen.getByLabelText('Frequency (1-10)')).toBeInTheDocument();
    expect(screen.getByLabelText('Pick a date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Symptom' })).toBeInTheDocument();
  });

  it('shows a message when no symptoms are logged', () => {
    require('@/firebase').useCollection.mockImplementation(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));
    render(<SymptomTrackerPage />);
    expect(screen.getByText('No symptoms logged yet.')).toBeInTheDocument();
  });

  it('displays an error message when data loading fails', () => {
    require('@/firebase').useCollection.mockImplementation(() => ({
      data: null,
      isLoading: false,
      error: true,
    }));
    render(<SymptomTrackerPage />);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(
      screen.getByText('Could not load symptom data. Please check your connection or try again later.')
    ).toBeInTheDocument();
  });

  it('submits the form and shows a success toast', async () => {
    const toast = jest.fn();
    require('@/hooks/use-toast').useToast.mockImplementation(() => ({ toast }));

    render(<SymptomTrackerPage />);

    fireEvent.change(screen.getByLabelText('Symptom Name'), {
      target: { value: 'Headache' },
    });
    // Assuming default values for severity, frequency, and date are acceptable

    fireEvent.click(screen.getByRole('button', { name: 'Log Symptom' }));

    await waitFor(() =>
      expect(require('@/firebase').addDocumentNonBlocking).toHaveBeenCalled()
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'Symptom Logged!',
      description: 'Headache has been added to your tracker.',
    });
  });

  it('handles deleting all symptoms', async () => {
    const toast = jest.fn();
    require('@/hooks/use-toast').useToast.mockImplementation(() => ({ toast }));
    require('@/firebase').useCollection.mockImplementation(() => ({
      data: [{ id: '1', symptom: 'Headache', severity: 5, frequency: 5, date: '2024-01-01T00:00:00.000Z', userId: 'test-user', createdAt: '2024-01-01T00:00:00.000Z' }],
      isLoading: false,
      error: null,
    }));

    render(<SymptomTrackerPage />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete All Data/i });
    expect(deleteButton).not.toBeDisabled();

    fireEvent.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: 'Yes, delete my data' });
    fireEvent.click(confirmButton);


    await waitFor(() => expect(require('@/firebase').deleteCollectionNonBlocking).toHaveBeenCalled());

    expect(toast).toHaveBeenCalledWith({
      title: 'Data Deleted',
      description: 'All your symptom data has been successfully deleted.',
    });
  });
});
