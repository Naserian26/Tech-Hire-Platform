import React from 'react';
import { Star, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

const CompanyReviewPage = () => {
  // Mock Data
  const company = { name: "TechFlow Inc", industry: "Software", avgRating: 4.2 };
  const reviews = [
    { id: 1, user: "DevOne", rating: 5, text: "Great culture and pay!", sentiment: "positive" },
    { id: 2, user: "DevTwo", rating: 3, text: "Management is okay but work life balance is tough.", sentiment: "neutral" },
    { id: 3, user: "DevThree", rating: 1, text: "Toxic environment.", sentiment: "negative" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-ui-bg text-white">
      {/* Header */}
      <div className="mb-8 border-b border-slate-700 pb-6">
        <h1 className="text-3xl font-bold text-white">{company.name}</h1>
        <p className="text-slate-400">{company.industry}</p>
        
        <div className="flex items-center gap-4 mt-4">
          <div className="text-4xl font-bold text-accent-teal">{company.avgRating}</div>
          <div className="flex text-yellow-500">
            {[1,2,3,4].map(n => <Star key={n} fill="currentColor" size={20} />)}
            <Star size={20} />
          </div>
          <span className="text-slate-500 text-sm">(128 Reviews)</span>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((review) => (
          <div key={review.id} className="bg-ui-card border border-slate-700 p-6 rounded-xl relative">
            {/* Sentiment Indicator */}
            <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${
              review.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
              review.sentiment === 'negative' ? 'bg-rose-500/20 text-rose-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {review.sentiment === 'positive' ? <ThumbsUp size={12} /> : 
               review.sentiment === 'negative' ? <ThumbsDown size={12} /> : 
               <MessageSquare size={12} />}
              {review.sentiment.toUpperCase()}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
              <div>
                <p className="font-bold text-sm">{review.user}</p>
                <div className="flex text-yellow-500 text-xs">
                  {[...Array(review.rating)].map((_, i) => <Star key={i} fill="currentColor" size={12} />)}
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">"{review.text}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyReviewPage;