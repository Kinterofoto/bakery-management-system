export function FooterSaren() {
  return (
    <footer className="bg-[#27282E] text-white">
      {/* Top Banner */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-12">
          {[
            { title: 'Free Shipping', desc: 'On orders over $50' },
            { title: '24/7 Support', desc: 'Dedicated customer service' },
            { title: 'Secure Payment', desc: '100% payment protected' },
            { title: 'Easy Returns', desc: 'Hassle-free 30-day returns' }
          ].map((item, i) => (
            <div key={i} className="text-center md:text-left">
              <p className="font-semibold text-lg mb-1">{item.title}</p>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[#DFD860] rounded-sm flex items-center justify-center">
                <span className="text-[#27282E] font-bold text-sm">P</span>
              </div>
              <span className="font-bold text-white tracking-tight">SAREN</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Premium bakery products for professionals. Quality guaranteed, fast delivery.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase text-sm tracking-wide">Shop</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition">All Products</a></li>
              <li><a href="#" className="hover:text-white transition">Best Sellers</a></li>
              <li><a href="#" className="hover:text-white transition">New Arrivals</a></li>
              <li><a href="#" className="hover:text-white transition">On Sale</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase text-sm tracking-wide">Support</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition">Shipping Info</a></li>
              <li><a href="#" className="hover:text-white transition">Returns</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase text-sm tracking-wide">Company</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition">About Us</a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
              <li><a href="#" className="hover:text-white transition">Careers</a></li>
              <li><a href="#" className="hover:text-white transition">Press</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase text-sm tracking-wide">Legal</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Accessibility</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
            <p>&copy; 2024 Pastry Industrial. All rights reserved.</p>
            <p>Designed & built with care for your bakery.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
