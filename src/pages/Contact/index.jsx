import React, { useState, useRef } from 'react';
import ReCAPTCHA from "react-google-recaptcha";
import Title from '../../components/Title';
import { useAppContext } from '../../contexts/AppContext';

function Contact() {
    const { sendEmail } = useAppContext();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');
    const recaptchaRef = useRef();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const captchaValue = recaptchaRef.current.getValue();
        if (!captchaValue) {
            setSubmitMessage('Please verify that you are not a robot.');
            return;
        }

        setIsLoading(true);
        setSubmitMessage('');

        try {
            await sendEmail({ ...formData, captcha: captchaValue });
            setSubmitMessage('Message sent successfully!');
            setFormData({ name: '', email: '', subject: '', message: '' });
            recaptchaRef.current.reset();
        } catch (error) {
            if (error.message === 'Rate limit exceeded') {
                setSubmitMessage('Rate limit exceeded. Please try again later.');
            } else {
                setSubmitMessage('Failed to send message. Please try again.');
            }
            console.error('Error sending email:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto pb-16">
            <Title>Contact</Title>
            <h1 className="text-4xl font-bold text-center mb-8">Stay In Touch</h1>
            <div className="max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            required
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder='Enter your Name'
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                        />
                    </div>
                    <div>
                        <input
                            type="email"
                            required
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder='Enter your Email'
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            required
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder='Subject'
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                        />
                    </div>
                    <div>
                        <textarea
                            id="message"
                            required
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder='Enter your message'
                            rows={4}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                        ></textarea>
                    </div>
                    <div className="flex justify-center">
                        <div className="w-full">
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={process.env.REACT_APP_CONTACT_FORM_RECAPTCHA_SITE_KEY}
                                className="w-full flex justify-center"
                            />
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-black text-white px-6 py-2 rounded hover:bg-gray-800 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </form>
                {submitMessage && (
                    <p className={`mt-4 text-center ${submitMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                        {submitMessage}
                    </p>
                )}
            </div>
        </div>
    );
}

export default Contact;