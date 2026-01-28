import { Request, Response } from 'express';
export declare class IncidentsController {
    create(req: Request, res: Response): Promise<void>;
    getAll(req: Request, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    complete(req: Request, res: Response): Promise<void>;
    private generateIncidentNumber;
}
//# sourceMappingURL=IncidentsController.d.ts.map