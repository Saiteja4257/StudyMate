import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DocSidebar from '../components/workspace/DocSidebar';
import WorkspaceMain from '../components/workspace/WorkspaceMain';
import { documentAPI } from '../services/api';

const Workspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentAPI.getAll();
      setDocuments(res.data);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  }, []);

  // Load documents list
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Load the selected document
  useEffect(() => {
    if (!id) return;

    const fetchDoc = async () => {
      setLoadingDoc(true);
      try {
        const res = await documentAPI.getById(id);
        setSelectedDoc(res.data);
      } catch (error) {
        console.error('Failed to fetch document', error);
        setSelectedDoc(null);
      } finally {
        setLoadingDoc(false);
      }
    };

    fetchDoc();
  }, [id]);

  // Re-fetch after generate/regenerate
  const handleDocumentUpdate = useCallback(async () => {
    fetchDocuments();
    if (id) {
      try {
        const res = await documentAPI.getById(id);
        setSelectedDoc(res.data);
      } catch (error) {
        console.error('Failed to refresh document', error);
      }
    }
  }, [id, fetchDocuments]);

  // Handle selecting a different document
  const handleSelectDoc = useCallback(
    (docId: string) => {
      navigate(`/space/${docId}`);
    },
    [navigate]
  );

  // Handle documents list change (after upload or delete)
  const handleDocumentsChange = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <main className="flex-1 flex flex-col h-screen">
        {loadingDoc ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <WorkspaceMain document={selectedDoc} onDocumentUpdate={handleDocumentUpdate} />
        )}
      </main>
    </div>
  );
};

export default Workspace;
