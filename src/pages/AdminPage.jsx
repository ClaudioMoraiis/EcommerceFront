import { useEffect, useMemo, useState } from 'react'
import {
  createCategory,
  createProduct,
  fetchCategories,
  fetchProducts,
  removeProduct,
  uploadProductImage,
  updateProduct,
} from '../api/catalog'

const initialProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  categoryId: '',
  images: '',
}

const initialCategoryForm = {
  name: '',
}

const initialImageLinkForm = {
  productId: '',
}

function parseImageIds(rawValue) {
  if (!rawValue) return []

  return String(rawValue)
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('product')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [productForm, setProductForm] = useState(initialProductForm)
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [imageLinkForm, setImageLinkForm] = useState(initialImageLinkForm)
  const [editingProductId, setEditingProductId] = useState(null)
  const [error, setError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categoryMessage, setCategoryMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedImageFiles, setSelectedImageFiles] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [linkFiles, setLinkFiles] = useState([])
  const [linkUploading, setLinkUploading] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linkProgress, setLinkProgress] = useState('')
  const [linkFileInputKey, setLinkFileInputKey] = useState(0)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [productData, categoryData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ])
      setProducts(productData)
      setCategories(categoryData)
    } catch (err) {
      setError(err.message || 'Falha ao carregar painel admin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  )

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => String(a.name || a.nome || '').localeCompare(String(b.name || b.nome || ''))),
    [categories],
  )

  const selectedLinkProduct = useMemo(() => {
    const productId = Number(imageLinkForm.productId)
    if (!Number.isFinite(productId) || productId <= 0) return null
    return sortedProducts.find((product) => Number(product.id) === productId) || null
  }, [imageLinkForm.productId, sortedProducts])

  const filteredProductsForPicker = useMemo(() => {
    const term = (productSearch || '').trim().toLowerCase()
    if (!term) return sortedProducts
    return sortedProducts.filter((product) => {
      const name = String(product.name || '').toLowerCase()
      const id = String(product.id || '')
      return name.includes(term) || id.includes(term)
    })
  }, [productSearch, sortedProducts])

  const submitProduct = async (event) => {
    event.preventDefault()
    setError('')

    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      description: (productForm.description || '').trim(),
      images: parseImageIds(productForm.images),
    }

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload)
      } else {
        await createProduct(payload)
      }
      setProductForm(initialProductForm)
      setEditingProductId(null)
      await loadData()
    } catch (err) {
      setError(err.message || 'Erro ao salvar produto.')
    }
  }

  const submitCategory = async (event) => {
    event.preventDefault()
    setCategoryError('')
    setCategoryMessage('')

    try {
      await createCategory({
        name: (categoryForm.name || '').trim(),
      })

      setCategoryForm(initialCategoryForm)
      setCategoryMessage('Categoria cadastrada com sucesso.')
      await loadData()
    } catch (err) {
      const rawMessage = err.message || 'Erro ao cadastrar categoria.'
      const message = rawMessage.includes('404')
        ? 'Cadastro de categoria ainda nao esta disponivel no backend (endpoint nao encontrado).'
        : rawMessage
      setCategoryError(message)
    }
  }

  const handleUploadImage = async () => {
    setError('')
    setUploadMessage('')
    setUploadProgress('')

    if (!editingProductId) {
      setError('Salve o produto primeiro para habilitar upload de imagem.')
      return
    }

    if (!selectedImageFiles.length) {
      setError('Selecione uma ou mais imagens do computador.')
      return
    }

    setUploadingImage(true)
    try {
      const uploadedIds = []

      for (let index = 0; index < selectedImageFiles.length; index += 1) {
        const file = selectedImageFiles[index]
        setUploadProgress(`Enviando ${index + 1} de ${selectedImageFiles.length}: ${file.name}`)
        const uploaded = await uploadProductImage(editingProductId, file)
        const uploadedImageId = Number(uploaded?.id)
        if (Number.isFinite(uploadedImageId) && uploadedImageId > 0) {
          uploadedIds.push(uploadedImageId)
        }
      }

      if (uploadedIds.length > 0) {
        setProductForm((prev) => {
          const currentIds = parseImageIds(prev.images)
          const nextIds = [...currentIds]
          uploadedIds.forEach((id) => {
            if (!nextIds.includes(id)) {
              nextIds.push(id)
            }
          })
          return {
            ...prev,
            images: nextIds.join(', '),
          }
        })
        setUploadMessage(
          `${uploadedIds.length} imagem(ns) enviada(s) com sucesso. IDs: ${uploadedIds.join(', ')}`,
        )
      } else {
        setUploadMessage('Upload concluido, mas o backend nao retornou IDs das imagens.')
      }
      setUploadProgress('')

      setSelectedImageFiles([])
      setFileInputKey((value) => value + 1)
      await loadData()
    } catch (err) {
      setUploadProgress('')
      setError(err.message || 'Falha ao enviar imagem.')
    } finally {
      setUploadingImage(false)
    }
  }

  const onEditProduct = (product) => {
    setActiveTab('product')
    setEditingProductId(product.id)
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      stock: product.stock || '',
      categoryId: product.categoryId || '',
      images: Array.isArray(product.images) ? product.images.join(', ') : '',
    })
  }

  const handleLinkImagesByProductId = async () => {
    setLinkError('')
    setLinkMessage('')
    setLinkProgress('')

    const productId = Number(imageLinkForm.productId)
    if (!Number.isFinite(productId) || productId <= 0) {
      setLinkError('Informe um ID de produto valido.')
      return
    }

    if (!linkFiles.length) {
      setLinkError('Selecione uma ou mais imagens para vincular.')
      return
    }

    setLinkUploading(true)
    try {
      const uploadedIds = []
      for (let index = 0; index < linkFiles.length; index += 1) {
        const file = linkFiles[index]
        setLinkProgress(`Enviando ${index + 1} de ${linkFiles.length}: ${file.name}`)
        const uploaded = await uploadProductImage(productId, file)
        const uploadedImageId = Number(uploaded?.id)
        if (Number.isFinite(uploadedImageId) && uploadedImageId > 0) {
          uploadedIds.push(uploadedImageId)
        }
      }

      if (uploadedIds.length > 0) {
        setLinkMessage(
          `${uploadedIds.length} imagem(ns) vinculada(s) ao produto #${productId}. IDs: ${uploadedIds.join(', ')}`,
        )
      } else {
        setLinkMessage('Vinculo concluido, mas o backend nao retornou IDs das imagens.')
      }

      setLinkFiles([])
      setLinkProgress('')
      setLinkFileInputKey((value) => value + 1)
      await loadData()
    } catch (err) {
      setLinkProgress('')
      setLinkError(err.message || 'Falha ao vincular imagens ao produto.')
    } finally {
      setLinkUploading(false)
    }
  }

  if (loading) return <p className="muted">Carregando painel admin...</p>

  return (
    <section className="stack-lg admin-shell">
      <div className="card admin-header-card">
        <span className="eyebrow">Area administrativa</span>
        <h1>Painel Admin</h1>
        <p className="muted">Cadastros organizados por abas para facilitar gestao.</p>
        <div className="admin-stats">
          <span className="chip">Produtos: {sortedProducts.length}</span>
          <span className="chip">Categorias: {sortedCategories.length}</span>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="admin-tabs" role="tablist" aria-label="Abas do painel admin">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'product'}
          className={activeTab === 'product' ? 'admin-tab admin-tab-active' : 'admin-tab'}
          onClick={() => setActiveTab('product')}
        >
          Cadastro de produto
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'category'}
          className={activeTab === 'category' ? 'admin-tab admin-tab-active' : 'admin-tab'}
          onClick={() => setActiveTab('category')}
        >
          Cadastro de categoria
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'list'}
          className={activeTab === 'list' ? 'admin-tab admin-tab-active' : 'admin-tab'}
          onClick={() => setActiveTab('list')}
        >
          Itens cadastrados
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'image-link'}
          className={activeTab === 'image-link' ? 'admin-tab admin-tab-active' : 'admin-tab'}
          onClick={() => setActiveTab('image-link')}
        >
          Vincular imagens
        </button>
      </div>

      {activeTab === 'product' && (
        <article className="card stack-md admin-tab-panel" role="tabpanel">
          <h2>{editingProductId ? 'Editar produto' : 'Cadastrar produto'}</h2>
          <form className="stack-sm" onSubmit={submitProduct}>
            <label>
              Nome
              <input
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Descricao
              <textarea
                rows={4}
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Descreva o produto, diferenciais, conteudo e uso principal"
              />
            </label>
            <label>
              Preco
              <input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, price: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Estoque
              <input
                type="number"
                min="0"
                step="1"
                value={productForm.stock}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, stock: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Categoria
              <select
                value={productForm.categoryId}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))
                }
                required
              >
                <option value="">Selecione</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name || category.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              IDs das imagens
              <input
                value={productForm.images}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, images: event.target.value }))
                }
                placeholder="Ex.: 101, 102"
              />
            </label>
            <p className="muted">
              Informe os IDs das imagens separados por virgula, conforme cadastro no backend.
            </p>
            <label>
              Selecionar imagem do computador
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : []
                  setSelectedImageFiles(files)
                }}
              />
            </label>
            {!!selectedImageFiles.length && (
              <p className="muted">{selectedImageFiles.length} arquivo(s) selecionado(s).</p>
            )}
            <div className="row-gap">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleUploadImage}
                disabled={!editingProductId || !selectedImageFiles.length || uploadingImage}
              >
                {uploadingImage ? 'Enviando imagens...' : 'Enviar imagens para este produto'}
              </button>
            </div>
            {uploadProgress && <p className="muted">{uploadProgress}</p>}
            {!editingProductId && (
              <p className="muted">Crie o produto primeiro e depois use o upload de imagem na edicao.</p>
            )}
            {uploadMessage && <p className="muted">{uploadMessage}</p>}
            {editingProductId && parseImageIds(productForm.images).length > 0 && (
              <div className="admin-image-preview-grid">
                {parseImageIds(productForm.images).map((imageId) => (
                  <figure key={imageId} className="admin-image-preview-item">
                    <img
                      src={`/backend/produto-imagem/produto/${editingProductId}/images/${imageId}`}
                      alt={`Imagem ${imageId} do produto`}
                    />
                    <figcaption>ID {imageId}</figcaption>
                  </figure>
                ))}
              </div>
            )}

            <div className="row-gap">
              <button type="submit" className="btn">
                {editingProductId ? 'Salvar alteracoes' : 'Cadastrar produto'}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingProductId(null)
                    setProductForm(initialProductForm)
                    setSelectedImageFiles([])
                    setUploadMessage('')
                    setUploadProgress('')
                    setFileInputKey((value) => value + 1)
                  }}
                >
                  Cancelar edicao
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      {activeTab === 'category' && (
        <article className="card stack-md admin-tab-panel" role="tabpanel">
          <h2>Cadastrar categoria</h2>
          <form className="stack-sm" onSubmit={submitCategory}>
            <label>
              Nome da categoria
              <input
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ex.: Monitores"
                required
              />
            </label>
            <button type="submit" className="btn btn-ghost">
              Cadastrar categoria
            </button>
          </form>
          {categoryMessage && <p className="muted">{categoryMessage}</p>}
          {categoryError && <p className="error-text">{categoryError}</p>}
          {!!sortedCategories.length && (
            <div className="stack-sm">
              <p className="muted">Categorias disponiveis:</p>
              {sortedCategories.map((category) => (
                <div key={category.id} className="row-between category-row">
                  <span>
                    {category.name || category.nome} (ID {category.id})
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setProductForm((prev) => ({ ...prev, categoryId: String(category.id) }))
                      setActiveTab('product')
                    }}
                  >
                    Usar no produto
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      )}

      {activeTab === 'list' && (
        <article className="card stack-md admin-tab-panel" role="tabpanel">
          <h2>Produtos cadastrados</h2>
          {!sortedProducts.length ? (
            <p className="muted">Nenhum produto cadastrado.</p>
          ) : (
            sortedProducts.map((product) => (
              <div key={product.id} className="row-between product-row">
                <div>
                  <strong>{product.name}</strong>
                  <p className="muted line-clamp">{product.description || 'Sem descricao cadastrada.'}</p>
                  <p className="muted">R$ {Number(product.price || 0).toFixed(2)}</p>
                  <p className="muted">Estoque: {Number(product.stock || 0)}</p>
                </div>
                <div className="row-gap">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onEditProduct(product)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setImageLinkForm({ productId: String(product.id) })
                      setShowProductPicker(false)
                      setProductSearch('')
                      setActiveTab('image-link')
                    }}
                  >
                    Vincular imagens
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={async () => {
                      try {
                        await removeProduct(product.id)
                        await loadData()
                      } catch (err) {
                        setError(err.message || 'Erro ao remover produto.')
                      }
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </article>
      )}

      {activeTab === 'image-link' && (
        <article className="card stack-md admin-tab-panel" role="tabpanel">
          <h2>Vincular imagens ao produto</h2>
          <p className="muted">Informe o ID do produto e envie as imagens para inserir direto na tabela ProductImage.</p>

          <label>
            ID do produto
            <div className="product-picker-inline">
              <input
                type="number"
                min="1"
                value={imageLinkForm.productId}
                onChange={(event) =>
                  setImageLinkForm((prev) => ({ ...prev, productId: event.target.value }))
                }
                placeholder="Ex.: 12"
                required
              />
              <button
                type="button"
                className="btn btn-ghost picker-icon-btn"
                onClick={() => setShowProductPicker((value) => !value)}
                aria-label="Buscar produto"
                title="Buscar produto"
              >
                <svg viewBox="0 0 24 24" fill="none" className="picker-icon" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </label>
          {selectedLinkProduct && (
            <p className="muted">
              Produto selecionado: <strong>{selectedLinkProduct.name}</strong> (ID {selectedLinkProduct.id})
            </p>
          )}

          {showProductPicker && (
            <div className="product-picker-panel stack-sm">
              <label>
                Buscar produto por nome ou ID
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Ex.: Notebook ou 15"
                />
              </label>
              <div className="product-picker-list">
                {!filteredProductsForPicker.length ? (
                  <p className="muted">Nenhum produto encontrado.</p>
                ) : (
                  filteredProductsForPicker.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      className="product-picker-item"
                      onClick={() => {
                        setImageLinkForm({ productId: String(product.id) })
                        setShowProductPicker(false)
                        setProductSearch('')
                      }}
                    >
                      <span>{product.name}</span>
                      <span className="muted">ID {product.id}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <label>
            Selecionar imagens
            <input
              key={linkFileInputKey}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : []
                setLinkFiles(files)
              }}
            />
          </label>

          {!!linkFiles.length && <p className="muted">{linkFiles.length} arquivo(s) selecionado(s).</p>}

          <div className="row-gap">
            <button
              type="button"
              className="btn"
              disabled={linkUploading || !imageLinkForm.productId || !linkFiles.length}
              onClick={handleLinkImagesByProductId}
            >
              {linkUploading ? 'Vinculando imagens...' : 'Vincular imagens ao produto'}
            </button>
          </div>

          {linkProgress && <p className="muted">{linkProgress}</p>}
          {linkMessage && <p className="muted">{linkMessage}</p>}
          {linkError && <p className="error-text">{linkError}</p>}
        </article>
      )}
    </section>
  )
}
