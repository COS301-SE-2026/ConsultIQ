import { render, screen, fireEvent } from '@testing-library/react';
import EducationForm from '../src/features/consultants/components/skills/education-form';
import { BrowserRouter } from 'react-router-dom';

describe('Education form component', () => {

    beforeEach(() => {
         sessionStorage.clear();
         jest.clearAllMocks();

         if(!globalThis.crypto){
            Object.defineProperty(globalThis, 'crypto',{
                value: {randomUUID: () => 'mocked-uuid-1234'},
                writable: true
            });
         }
    });

    const renderComponent = () => 
        render(
          <BrowserRouter>
            <EducationForm />
          </BrowserRouter>
        );


    it('all input fields should be empty and the add education button disabled', () => {

        renderComponent();

        expect(sessionStorage.getItem("education_list")).toBe('[]');
        expect(screen.getByLabelText(/Institution Name/i)).toHaveValue('');
        expect(screen.getByLabelText(/Qualification/i)).toHaveValue('');
        expect(screen.getByRole('button', { name: /add education/i })).toBeDisabled();
    });

    it('input fields display values in session storage ', () => {

        sessionStorage.setItem("education_institutionName", "University of Pretoria");
        sessionStorage.setItem("education_qualification", "BSc Computer Science");
        sessionStorage.setItem("education_startDate", "12/02/2020");
        sessionStorage.setItem("education_endDate","31/12/2023");
        
        renderComponent();

    
        expect(screen.getByLabelText(/Institution Name/i)).toHaveValue('University of Pretoria');
         expect(screen.getByLabelText(/Qualification/i)).toHaveValue('BSc Computer Science');
        expect(screen.getByLabelText(/Start Date/i)).toHaveValue('12/02/2020');
       expect(screen.getByLabelText(/End Date/i)).toHaveValue('31/12/2023');
    });

    it('should sanitize instituion and qualification input/', () => {
   
        renderComponent();
        const institutionInput = screen.getByLabelText(/Institution Name/i);
        const qualificationInput = screen.getByLabelText(/Qualification/i);

        fireEvent.change(institutionInput,{target:{value: "University# of Pretoria"}});
        fireEvent.change(qualificationInput,{target:{value: "BSc @Computer Science"}});
        
        expect(institutionInput).toHaveValue("University# of Pretoria");

        
            expect(sessionStorage.getItem("education_institutionName")).toBe("University of Pretoria");
            expect(sessionStorage.getItem("education_qualification")).toBe("BSc Computer Science");
    

       
    });

    it('The end date should auto clear if start date is changed to a later date', () => {
   
        renderComponent();
        const startDateInput = screen.getByLabelText(/Start Date/i);
        const endDateInput = screen.getByLabelText(/End Date/i);

        fireEvent.change(endDateInput,{target:{value: "15/11/2025"}});
        expect(endDateInput).toHaveValue("15/11/2025");


        fireEvent.change(startDateInput,{target:{value: "20/12/2026"}});
        expect(endDateInput).toHaveValue("");
       
    });

    it('successfully adds education to the list and resets the form', () => {
        renderComponent();

        const institutionInput = screen.getByLabelText(/Institution Name/i);
        const qualificationInput = screen.getByLabelText(/Qualification/i);
        const endDateInput = screen.getByLabelText(/End Date/i);
        const addButton = screen.getByRole('button',{name:/add education/i});

        fireEvent.change(institutionInput,{target:{value: "University of Pretoria"}});
        fireEvent.change(qualificationInput,{target:{value: "BSc Computer Science"}});
        fireEvent.change(endDateInput,{target:{value: "30/11/2026"}});
        expect(addButton).not.toBeDisabled();
        fireEvent.click(addButton);

        expect(institutionInput).toHaveValue("");
        expect(qualificationInput).toHaveValue("");
        expect(endDateInput).toHaveValue("");

        const savedList = JSON.parse(sessionStorage.getItem("education_list") || "[]");
        expect(savedList).toHaveLength(1);
        expect(savedList[0]).toMatchObject({
            institution: "University of Pretoria",
            qualification: "BSc Computer Science",
            endYear: 2026
        });



    });

    






});