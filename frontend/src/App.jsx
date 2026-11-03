import { useEffect, useMemo, useState } from 'react'
import './App.css'

const defaultStore = {
  name: 'Sanjib kirana store',
  address: 'Suryabintyak, BKT',
  phone: '+977-98XXXXXXXX',
  email: 'hello@sanjibkirana.com',
  hours: '6:00 AM - 9:00 PM',
}

function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [store, setStore] = useState(defaultStore)
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('adminToken') || '')
  const [adminOrders, setAdminOrders] = useState([])
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminNotice, setAdminNotice] = useState('')
  const [editingProductId, setEditingProductId] = useState(null)
  const [productDraft, setProductDraft] = useState({
    name: '',
    category: 'fresh',
    price: '',
    unit: '',
    description: '',
  })
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [orderConfirmation, setOrderConfirmation] = useState('')

  useEffect(() => {
    fetch('http://localhost:5001/api/store')
      .then((response) => response.json())
      .then((data) => {
        if (data.store) setStore(data.store)
        if (data.categories) setCategories(data.categories)
      })
      .catch(() => {
        setStore(defaultStore)
      })

    fetch('http://localhost:5001/api/products')
      .then((response) => response.json())
      .then((data) => {
        if (data.products) setProducts(data.products)
      })
      .catch(() => {
        setProducts([])
      })
  }, [])

  useEffect(() => {
    if (!adminMode || !adminToken) return

    fetch('http://localhost:5001/api/admin/orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load orders.')
        setAdminOrders(data.orders)
      })
      .catch((error) => {
        setAdminError(error.message)
        if (error.message.toLowerCase().includes('session')) {
          sessionStorage.removeItem('adminToken')
          setAdminToken('')
        }
      })
  }, [adminMode, adminToken])

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory
      const searchTerm = search.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
      return matchesCategory && matchesSearch
    })
  }, [products, activeCategory, search])

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const deliveryFee = subtotal > 0 && subtotal <= 999 ? 35 : 0
  const total = subtotal + deliveryFee
  const callHref = store.phone.includes('X') ? '#contact' : `tel:${store.phone}`

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(`http://localhost:5001/api${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        ...options.headers,
      },
    })
    const data = response.status === 204 ? {} : await response.json()
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.')
    return data
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    setCheckoutSubmitting(true)
    setCheckoutError('')

    try {
      const data = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer,
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        }),
      })
      setOrderConfirmation(data.order.id)
      setCart([])
      setCheckoutOpen(false)
      setCustomer({ name: '', phone: '', address: '' })
    } catch (error) {
      setCheckoutError(error.message)
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  const loginAdmin = async (event) => {
    event.preventDefault()
    setAdminError('')
    setAdminNotice('')

    try {
      const data = await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      })
      sessionStorage.setItem('adminToken', data.token)
      setAdminToken(data.token)
      setAdminPassword('')
    } catch (error) {
      setAdminError(error.message)
    }
  }

  const addAdminProduct = async (event) => {
    event.preventDefault()
    setAdminError('')
    setAdminNotice('')

    try {
      const data = await apiRequest(
        editingProductId ? `/admin/products/${editingProductId}` : '/admin/products',
        {
        method: editingProductId ? 'PUT' : 'POST',
        body: JSON.stringify(productDraft),
        }
      )
      setProducts((current) =>
        editingProductId
          ? current.map((product) => (product.id === editingProductId ? data.product : product))
          : [...current, data.product]
      )
      setAdminNotice(`${data.product.name} was ${editingProductId ? 'updated' : 'added'} in the catalog.`)
      setEditingProductId(null)
      setProductDraft({ name: '', category: 'fresh', price: '', unit: '', description: '' })
    } catch (error) {
      setAdminError(error.message)
    }
  }

  const editAdminProduct = (product) => {
    setEditingProductId(product.id)
    setProductDraft({
      name: product.name,
      category: product.category,
      price: String(product.price),
      unit: product.unit,
      description: product.description,
    })
    setAdminError('')
    setAdminNotice('')
  }

  const deleteAdminProduct = async (productId) => {
    setAdminError('')
    setAdminNotice('')
    try {
      await apiRequest(`/admin/products/${productId}`, { method: 'DELETE' })
      setProducts((current) => current.filter((product) => product.id !== productId))
      if (editingProductId === productId) {
        setEditingProductId(null)
        setProductDraft({ name: '', category: 'fresh', price: '', unit: '', description: '' })
      }
      setAdminNotice('Product removed from the catalog.')
    } catch (error) {
      setAdminError(error.message)
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    setAdminError('')
    try {
      const data = await apiRequest(`/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setAdminOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      )
    } catch (error) {
      setAdminError(error.message)
    }
  }

  const logoutAdmin = () => {
    sessionStorage.removeItem('adminToken')
    setAdminToken('')
    setAdminOrders([])
    setAdminNotice('')
    setAdminError('')
  }

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [
        ...current,
        { id: product.id, name: product.name, price: product.price, quantity: 1, unit: product.unit },
      ]
    })
  }

  const changeQuantity = (productId, change) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-badge">SK</div>
          <div>
            <p className="brand-title">{store.name}</p>
            <span>{store.address}</span>
          </div>
        </div>
        <nav className="topnav">
          <a href="#shop">Shop</a>
          <a href="#offers">Offers</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="header-actions">
          <button className="secondary-button admin-toggle" onClick={() => setAdminMode((mode) => !mode)}>
            {adminMode ? 'Storefront' : 'Admin'}
          </button>
          <a className="primary-button call-button" href={callHref}>Call now</a>
        </div>
      </header>

      <main className="page">
        {adminMode ? (
          adminToken ? (
            <section className="admin-dashboard">
              <div className="admin-heading">
                <div>
                  <span className="eyebrow">Store management</span>
                  <h1>Admin dashboard</h1>
                  <p>Manage customer orders and your grocery catalog.</p>
                </div>
                <button className="secondary-button" onClick={logoutAdmin}>Sign out</button>
              </div>
              {adminError && <p className="form-error" role="alert">{adminError}</p>}
              {adminNotice && <p className="form-success" role="status">{adminNotice}</p>}

              <div className="admin-stats">
                <div><span>Total orders</span><strong>{adminOrders.length}</strong></div>
                <div><span>Awaiting completion</span><strong>{adminOrders.filter((order) => !['Completed', 'Cancelled'].includes(order.status)).length}</strong></div>
                <div><span>Products in catalog</span><strong>{products.length}</strong></div>
              </div>

              <section className="admin-section">
                <div className="section-header">
                  <div><span className="eyebrow">Order desk</span><h2>Customer orders</h2></div>
                </div>
                {adminOrders.length ? (
                  <div className="orders-list">
                    {adminOrders.map((order) => (
                      <article className="order-card" key={order.id}>
                        <div className="order-summary">
                          <strong>Order #{order.id.slice(0, 8)}</strong>
                          <span>{new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="order-customer">
                          <strong>{order.customer.name}</strong>
                          <span>{order.customer.phone} · {order.customer.address}</span>
                        </div>
                        <div className="order-lines">
                          {order.items.map((item) => (
                            <span key={`${order.id}-${item.productId}`}>{item.quantity} × {item.name}</span>
                          ))}
                        </div>
                        <div className="order-status">
                          <strong>Rs. {order.total}</strong>
                          <select
                            aria-label={`Status for order ${order.id.slice(0, 8)}`}
                            value={order.status}
                            onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                          >
                            {['Received', 'Preparing', 'Out for delivery', 'Completed', 'Cancelled'].map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><h3>No orders yet</h3><p>New customer orders will appear here.</p></div>
                )}
              </section>

              <section className="admin-section">
                <div className="section-header">
                  <div><span className="eyebrow">Catalog</span><h2>Manage products</h2></div>
                </div>
                <form className="product-admin-form" onSubmit={addAdminProduct}>
                  <label>Product name<input required maxLength="100" value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label>
                  <label>Category<select value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                  <label>Price (Rs.)<input required type="number" min="1" step="1" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} /></label>
                  <label>Unit<input required maxLength="30" placeholder="e.g. 1kg" value={productDraft.unit} onChange={(event) => setProductDraft({ ...productDraft, unit: event.target.value })} /></label>
                  <label className="wide-field">Description<input required maxLength="300" value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></label>
                  <button className="primary-button" type="submit">{editingProductId ? 'Save changes' : 'Add product'}</button>
                  {editingProductId && <button className="secondary-button cancel-edit" type="button" onClick={() => {
                    setEditingProductId(null)
                    setProductDraft({ name: '', category: 'fresh', price: '', unit: '', description: '' })
                  }}>Cancel</button>}
                </form>
                <div className="admin-product-list">
                  {products.map((product) => (
                    <div className="admin-product-row" key={product.id}>
                      <div><strong>{product.name}</strong><span>{product.category} · {product.unit}</span></div>
                      <strong>Rs. {product.price}</strong>
                      <button className="secondary-button" onClick={() => editAdminProduct(product)}>Edit</button>
                      <button className="remove-button" onClick={() => deleteAdminProduct(product.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          ) : (
            <section className="admin-login-card">
              <span className="eyebrow">Store management</span>
              <h1>Admin sign in</h1>
              <p>Sign in with the store admin credentials configured on the server.</p>
              <form onSubmit={loginAdmin}>
                <label>Email<input required type="email" autoComplete="username" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} /></label>
                <label>Password<input required type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></label>
                {adminError && <p className="form-error" role="alert">{adminError}</p>}
                <button className="primary-button" type="submit">Sign in</button>
              </form>
            </section>
          )
        ) : (
          <>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">Fresh groceries delivered daily</span>
            <h1>Everything your kitchen needs, right at your doorstep.</h1>
            <p>
              From farm-fresh produce to pantry essentials, we bring quality groceries and
              trusted neighborhood service to {store.address}.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#shop">Shop now</a>
              <a className="secondary-button" href="#offers">View offers</a>
            </div>
            <div className="stats">
              <div>
                <strong>2.5k+</strong>
                <span>Happy homes</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>Customer rating</span>
              </div>
              <div>
                <strong>30 min</strong>
                <span>Fast delivery</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="delivery-card">
              <span>Order tracking</span>
              <h3>Fresh delivery in 30 min</h3>
              <div className="mini-items">
                <div className="mini-item">
                  <span>🥬</span>
                  <div>
                    <strong>Spinach</strong>
                    <small>Rs. 70</small>
                  </div>
                </div>
                <div className="mini-item">
                  <span>🍎</span>
                  <div>
                    <strong>Apples</strong>
                    <small>Rs. 180</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-card">
              <span>Today’s deal</span>
              <strong>20% OFF</strong>
              <small>On seasonal fruits</small>
            </div>
          </div>
        </section>

        <section className="feature-strip" id="offers">
          <div>
            <span>✅</span>
            <p>Fresh produce daily</p>
          </div>
          <div>
            <span>🚚</span>
            <p>Free delivery above Rs. 999</p>
          </div>
          <div>
            <span>💳</span>
            <p>Secure payments</p>
          </div>
          <div>
            <span>🌿</span>
            <p>Locally sourced</p>
          </div>
        </section>

        <section className="category-section">
          <div className="section-header">
            <div>
              <span className="eyebrow">Browse by category</span>
              <h2>Popular essentials</h2>
            </div>
          </div>
          <div className="category-grid">
            {categories.length > 0 ? (
              <>
                <button
                  className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`category-pill ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <span>{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </>
            ) : (
              <p className="muted">Loading categories...</p>
            )}
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-header">
            <div>
              <span className="eyebrow">Our collection</span>
              <h2>Fresh picks today</h2>
            </div>
            <div className="search-wrap">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search groceries..."
              />
            </div>
          </div>

          <div className="product-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-image">
                    <img src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80'} alt={product.name} />
                    <span className="product-tag">{product.tag}</span>
                  </div>
                  <div className="product-info">
                    <div className="product-topline">
                      <span>{product.category}</span>
                      <span>★ {product.rating}</span>
                    </div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-meta">
                      <div>
                        <strong>Rs. {product.price}</strong>
                        <small>/{product.unit}</small>
                      </div>
                      <button onClick={() => addToCart(product)}>Add to cart</button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>No products found</h3>
                <p>Try another search or switch category.</p>
              </div>
            )}
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-card">
            <span className="eyebrow">Why choose us</span>
            <h2>Neighborhood trust, quality groceries, and honest prices.</h2>
            <p>
              Sanjib kirana store proudly serves families across Suryabintyak, BKT with hand-
              picked produce, daily essentials, and thoughtful customer care.
            </p>
          </div>
          <div className="service-grid">
            <div className="service-item">
              <span>🥕</span>
              <h3>Fresh picks</h3>
              <p>Selected daily for the best taste and quality.</p>
            </div>
            <div className="service-item">
              <span>📦</span>
              <h3>Quick delivery</h3>
              <p>Easy, dependable delivery to your doorstep.</p>
            </div>
            <div className="service-item">
              <span>💬</span>
              <h3>Friendly support</h3>
              <p>Helpful service from a team you can trust.</p>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {!adminMode && <aside className="cart-panel">
        <div className="cart-header">
          <div>
            <span className="eyebrow">Your basket</span>
            <h3>Cart summary</h3>
          </div>
          <span className="cart-count">{cart.length} items</span>
        </div>

        <div className="cart-items">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.unit}</small>
                </div>
                <div className="quantity-control">
                  <button onClick={() => changeQuantity(item.id, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                </div>
                <p>Rs. {item.price * item.quantity}</p>
              </div>
            ))
          ) : (
            <p className="muted">Your basket is empty.</p>
          )}
        </div>

        <div className="totals">
          <div>
            <span>Subtotal</span>
            <strong>Rs. {subtotal}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>Rs. {deliveryFee}</strong>
          </div>
          <div className="grand-total">
            <span>Total</span>
            <strong>Rs. {total}</strong>
          </div>
        </div>

        <button
          className="checkout-button"
          disabled={!cart.length}
          onClick={() => {
            setCheckoutError('')
            setOrderConfirmation('')
            setCheckoutOpen(true)
          }}
        >
          Checkout
        </button>
      </aside>}

      <footer className="site-footer" id="contact">
        <div>
          <p className="brand-title">{store.name}</p>
          <span>{store.address}</span>
        </div>
        <div>
          <span>{store.phone}</span>
          <span>{store.email}</span>
        </div>
        <div>
          <span>Open today</span>
          <strong>{store.hours}</strong>
        </div>
      </footer>

      {checkoutOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCheckoutOpen(false)
        }}>
          <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button className="modal-close" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}>×</button>
            <span className="eyebrow">Almost there</span>
            <h2 id="checkout-title">Delivery details</h2>
            <p className="checkout-total">Order total <strong>Rs. {total}</strong></p>
            <form onSubmit={submitOrder}>
              <label>Your name<input required maxLength="100" autoComplete="name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label>
              <label>Phone number<input required maxLength="30" type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label>
              <label>Delivery address<textarea required maxLength="300" rows="3" autoComplete="street-address" value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} /></label>
              {checkoutError && <p className="form-error" role="alert">{checkoutError}</p>}
              <button className="checkout-button" type="submit" disabled={checkoutSubmitting}>
                {checkoutSubmitting ? 'Submitting order…' : 'Place order'}
              </button>
            </form>
          </section>
        </div>
      )}

      {orderConfirmation && (
        <div className="toast-success" role="status">
          <strong>Order received!</strong>
          <span>Reference: {orderConfirmation.slice(0, 8)}</span>
          <button aria-label="Dismiss confirmation" onClick={() => setOrderConfirmation('')}>×</button>
        </div>
      )}
    </div>
  )
}

export default App
