import { useState } from 'react';
import './FAQ.css';

// Define the structure for each FAQ item
interface FAQItem {
  question: string;
  answer: string;
}

// Array of FAQ data
const faqs: FAQItem[] = [
  {
    question: 'What is MyMoolah?',
    answer: 'MyMoolah is a digital wallet app designed for fast, secure, and low-cost payments. Inspired by Mojaloop, our mission is to increase financial inclusion by making digital finance accessible to everyone.'
  },
  {
    question: 'Is my money safe with MyMoolah?',
    answer: 'Yes. We use state-of-the-art encryption and security protocols to protect your account and transactions. While we are not a bank and funds are not government-insured, we adhere to best practices in financial security to keep your moolah safe.'
  },
  {
    question: 'How do I add money to my wallet?',
    answer: 'You can top up your wallet using several methods, including bank transfers, debit/credit cards, or by receiving money from another MyMoolah user. Simply tap the "Add Money" button on the dashboard to see your options.'
  },
  {
    question: 'Are there any fees for sending money?',
    answer: 'MyMoolah is built on a low-fee model. Sending money to other MyMoolah users is typically free. Certain transactions, like cashing out to a bank account or specific vendor payments, may have a small, transparent fee. All fees are clearly displayed before you confirm a transaction.'
  },
  {
    question: 'Can I use MyMoolah internationally?',
    answer: 'Currently, MyMoolah is focused on domestic transactions. We are actively working on expanding our services to support cross-border payments in the future. Stay tuned for updates!'
  }
];

// Reusable component for each accordion item
const AccordionItem: React.FC<{
  item: FAQItem;
  isOpen: boolean;
  onClick: () => void;
}> = ({ item, isOpen, onClick }) => {
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={onClick}>
        <span>{item.question}</span>
        <span className={`faq-icon ${isOpen ? 'open' : ''}`}>+</span>
      </button>
      <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
        <p>{item.answer}</p>
      </div>
    </div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleItemClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-container">
      <div className="faq-box">
        <div className="faq-header">
          <div className="faq-logo-container">
            <img src="/MyMoolahLogo2.svg" alt="MyMoolah Logo" style={{ height: 48, opacity: 0.8 }} />
          </div>
          <h1>Frequently Asked Questions</h1>
        </div>

        <div className="faq-list">
          {faqs.map((item, index) => (
            <AccordionItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onClick={() => handleItemClick(index)}
            />
          ))}
        </div>

        <div className="support-section">
          <h2>Still have questions?</h2>
          <p>If you can't find the answer you're looking for, our support team is here to help.</p>
          <a href="/contact" className="support-link">Contact Support</a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;