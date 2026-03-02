
  /* -----------------------------------------------------
     TESTING APPROVAL
  ----------------------------------------------------- */
  it('should approve icons', async () => {
    const ids = [1, 2];
    const updateQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    
    // Mock createQueryBuilder on repository
    const mockRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(updateQueryBuilder)
    }

    // Re-instantiate service with this mock repo if possible or spy on it
    // For simplicity, let's assume we can mock it on the module level or spy on prototype
    
    // Since we are mocking the dependency in the test setup below, let's look at icons.service.spec.ts IF IT EXISTS, 
    // or Create one now.
  });
