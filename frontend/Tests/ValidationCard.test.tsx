import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationCard } from '../src/features/authentication/components/ValidationCard';
import { toast } from 'sonner';


jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('ValidationCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fillForm = (email = '', pass = '', confirm = '') => {
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: pass } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: confirm } });
  };

 
  it('should show success toast when all inputs are valid', () => {
 
    render(<ValidationCard />);
    

    fillForm('test@example.com', 'Password123!', 'Password123!');
    fireEvent.click(screen.getByRole('button', { name: /register/i }));


    expect(toast.success).toHaveBeenCalledWith('Form submitted successfully!');
  });

  
  it('should show error when passwords do not match', () => {
    
    render(<ValidationCard />);


    fillForm('test@example.com', 'Password123!', 'WrongPass123!');
    fireEvent.click(screen.getByRole('button', { name: /register/i }));


    expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
  });

  it('should show error when password fails complexity requirements', () => {
    
    render(<ValidationCard />);


    fillForm('test@example.com', 'password', 'password');
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('one uppercase letter, one digit, and one special character'));
  });


  it('should show error when password is exactly 7 characters (too short)', () => {
   
    render(<ValidationCard />);


    fillForm('test@example.com', 'Pa1!456', 'Pa1!456');
    fireEvent.click(screen.getByRole('button', { name: /register/i }));


    expect(toast.error).toHaveBeenCalled();
  });

  it("should handle invalid email format (missing @)", () => {
    
    render(<ValidationCard />);

    
    fillForm("invalid-email", "Password123!", "Password123!");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

   
    expect(toast.error).toHaveBeenCalledWith("Invalid email format");
  });

  it("should handle empty email as required", () => {
    
    render(<ValidationCard />);

   
    fillForm("", "Password123!", "Password123!");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    
    expect(toast.error).toHaveBeenCalledWith("Email is required");
  });
});