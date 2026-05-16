import { render, screen, fireEvent } from '@testing-library/react';
import { LoginCard } from '../src/features/authentication/components/LoginCard';
import { toast } from 'sonner';
import { BrowserRouter } from 'react-router-dom';



jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('LoginCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => 
    render(
      <BrowserRouter>
        <LoginCard />
      </BrowserRouter>
    );


  it('should render all input fields and the login button', () => {

    renderComponent();

  
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

 
  it('should show error toast when email is empty', () => {
   
    renderComponent();
    const loginButton = screen.getByRole('button', { name: /login/i });

   
    fireEvent.click(loginButton);

 
    expect(toast.error).toHaveBeenCalledWith('Email is required');
  });

  it('should show error toast when email format is invalid', () => {
    
    renderComponent();
    const emailInput = screen.getByLabelText(/email/i);
    const loginButton = screen.getByRole('button', { name: /login/i });


    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(loginButton);

   
    expect(toast.error).toHaveBeenCalledWith('Invalid email format');
  });


  it('should allow valid emails with subdomains or special characters', () => {
   
    renderComponent();
    const emailInput = screen.getByLabelText(/email/i);
    const loginButton = screen.getByRole('button', { name: /login/i });


    fireEvent.change(emailInput, { target: { value: 'user.name@dept.company.org' } });
    fireEvent.click(loginButton);

    
    expect(toast.error).not.toHaveBeenCalled();
  });
});