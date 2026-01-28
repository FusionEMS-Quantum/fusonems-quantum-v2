import { Request, Response } from 'express';
export declare class AssignmentsController {
    recommend(req: Request, res: Response): Promise<void>;
    assign(req: Request, res: Response): Promise<void>;
    private calculateUnitScore;
    private matchCapabilities;
    private calculateETA;
    private calculateDistance;
    private generateRecommendationReason;
}
//# sourceMappingURL=AssignmentsController.d.ts.map