import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Star, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';



const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId: 6, // General category (ID 6 from database)
          priority,
          tags
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubmissionComplete(true);
        setCurrentStep(4);
      } else {
        console.error('Feedback submission failed:', data.message);
        alert(`Failed to submit feedback: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && tags.length < 10 && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };



  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Feedback</h2>
        <p className="text-gray-600">Help us improve MyMoolah with your valuable insights</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Feedback Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="Brief description of your feedback"
            className="mt-1"
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
        </div>

        <div>
          <Label htmlFor="description">Detailed Description *</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Please provide detailed feedback..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={6}
            maxLength={5000}
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/5000 characters</p>
        </div>


      </div>

              <Button
          onClick={() => setCurrentStep(2)}
          disabled={!title.trim() || !description.trim()}
          className="w-full"
        >
          Continue
        </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Additional Details</h2>
        <p className="text-gray-600">Help us prioritize and categorize your feedback</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Priority Level</Label>
          <div className="flex items-center space-x-2 mt-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setPriority(level)}
                className={`p-2 rounded-lg transition-all ${
                  priority === level
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Star className={`w-5 h-5 ${priority === level ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {priority === 1 && 'Critical - Immediate attention required'}
            {priority === 2 && 'High - Important issue'}
            {priority === 3 && 'Medium - Standard priority'}
            {priority === 4 && 'Low - Nice to have'}
            {priority === 5 && 'Very Low - Future consideration'}
          </p>
        </div>

        <div>
          <Label>Tags (Optional)</Label>
          <div className="flex space-x-2 mt-2">
            <Input
              value={newTag}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              className="flex-1"
              onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && addTag()}
            />
            <Button onClick={addTag} disabled={!newTag.trim() || tags.length >= 10}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                  <span>{tag}</span>
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Maximum 10 tags allowed</p>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep(3)}
          disabled={!title.trim() || !description.trim()}
          className="flex-1"
        >
          Review & Submit
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Feedback</h2>
        <p className="text-gray-600">Please review before submitting</p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Feedback Summary</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Title:</span>
              <p className="text-gray-900">{title}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Description:</span>
              <p className="text-gray-900">{description}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-600">Priority:</span>
              <div className="flex items-center space-x-1 mt-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Star
                    key={level}
                    className={`w-4 h-4 ${
                      level <= priority ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-gray-900">
                  {priority === 1 && 'Critical'}
                  {priority === 2 && 'High'}
                  {priority === 3 && 'Medium'}
                  {priority === 4 && 'Low'}
                  {priority === 5 && 'Very Low'}
                </span>
              </div>
            </div>
            {tags.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-600">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(2)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Feedback Submitted!</h2>
        <p className="text-gray-600">Thank you for your valuable feedback. Our AI is analyzing it now.</p>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => {
            setCurrentStep(1);
            setSubmissionComplete(false);
            setTitle('');
            setDescription('');
            setPriority(3);
            setTags([]);
          }}
          className="flex-1"
        >
          Submit Another Feedback
        </Button>
        <Button
          onClick={() => navigate('/dashboard')}
          className="flex-1"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Send Feedback</h1>
                <p className="text-sm text-gray-500">Help us improve MyMoolah</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                {step < 4 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </Card>
      </div>
    </div>
  );
};

export default FeedbackPage;
